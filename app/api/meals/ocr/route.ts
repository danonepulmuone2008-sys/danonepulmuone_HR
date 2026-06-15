import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { supabaseAdmin } from "@/lib/supabase"
import sharp from "sharp"

// 재시도(아래 runGeminiOcr)가 누적돼도 함수가 강제 종료되지 않도록 실행시간 한도를 늘린다.
// (설정이 없으면 Vercel 기본값이 적용돼 재시도 도중 504로 죽는다.)
export const maxDuration = 60

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const MODEL = "gemini-2.5-flash"
const OCR_TIMEOUT_MS = 15000
const OCR_MAX_ATTEMPTS = 2

const PROMPT = `이 영수증 이미지를 분석해서 아래 JSON 형식으로만 응답해. 다른 텍스트는 절대 포함하지 마.

{
  "storeName": "가맹점명 (없으면 빈 문자열)",
  "paidAt": "결제일시 ISO 8601 KST (예: 2024-05-06T12:30:00+09:00, 모르면 null)",
  "items": [
    { "name": "상품명", "unitPrice": 단가숫자, "qty": 수량숫자, "total": 합계숫자 }
  ],
  "totalAmount": 최종결제금액숫자
}

규칙:
- totalAmount는 항상 "최종 결제 금액"(부가세 포함 합계). 영수증의 합계·총액·받을금액 등 실제 카드 승인/결제 금액을 사용.
- items에는 실제 구매한 개별 메뉴만 포함 (합계·부가세·할인·쿠폰·과세·공급가액 등은 제외).
- 개별 메뉴 항목이 없고 금액만 있는 영수증(카드 매출전표 등)이면, items에 항목 1개만 만들고 그 total은 최종 결제 금액(부가세 포함)으로 설정.
- 가능하면 items의 total 합계가 totalAmount와 일치하도록.
- 금액은 숫자만 (원 기호·쉼표 없이).
- qty 없으면 1, unitPrice 없으면 total 값과 동일하게.`

interface ReceiptItem {
  name: string
  unitPrice: number
  qty: number
  total: number
}

interface ParsedReceipt {
  storeName: string
  paidAt: string
  items: ReceiptItem[]
  totalAmount: number
  isLunchTime: boolean
}

function nowKST(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())}T${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}:${pad(kst.getUTCSeconds())}+09:00`
}

function checkLunchTime(isoString: string | null): boolean {
  if (!isoString) return false
  try {
    const date = new Date(isoString)
    const kstMins = (date.getUTCHours() * 60 + date.getUTCMinutes() + 9 * 60) % (24 * 60)
    return kstMins >= 12 * 60 + 30 && kstMins <= 13 * 60 + 30
  } catch {
    return false
  }
}

// Gemini 응답에서 JSON 본문만 안전하게 추출
function extractJson(text: string): string {
  const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim()
  const start = cleaned.indexOf("{")
  const end = cleaned.lastIndexOf("}")
  if (start >= 0 && end > start) return cleaned.slice(start, end + 1)
  return cleaned
}

// 일시적 실패에 대비해 타임아웃 + 재시도로 Gemini OCR 호출
async function runGeminiOcr(ocrBase64: string): Promise<Record<string, unknown>> {
  const model = genAI.getGenerativeModel(
    { model: MODEL, generationConfig: { responseMimeType: "application/json" } },
    { timeout: OCR_TIMEOUT_MS },
  )
  let lastErr: unknown
  for (let attempt = 1; attempt <= OCR_MAX_ATTEMPTS; attempt++) {
    try {
      const result = await model.generateContent([
        { inlineData: { data: ocrBase64, mimeType: "image/jpeg" } },
        PROMPT,
      ])
      const text = result.response.text().trim()
      return JSON.parse(extractJson(text))
    } catch (err) {
      lastErr = err
      console.error(`[Gemini OCR] attempt ${attempt}/${OCR_MAX_ATTEMPTS} failed`, err)
    }
  }
  throw lastErr
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? ""
    if (!token) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get("image") as File
    if (!file) return NextResponse.json({ error: "이미지가 없습니다" }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())

    // 저장용: 최대 1200px, JPEG quality 75
    const compressedBuffer = await sharp(buffer)
      .rotate()
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer()

    // OCR용: EXIF 회전 보정 + 적당한 해상도(최대 1600px, quality 85)
    // 원본을 그대로 보내면 페이로드가 커져 타임아웃·실패가 잦고, 회전 미보정 시 인식률이 떨어진다.
    const ocrBuffer = await sharp(buffer)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer()
    const ocrBase64 = ocrBuffer.toString("base64")

    const storagePath = `${user.id}/${Date.now()}.jpg`
    const { error: uploadError } = await supabaseAdmin.storage
      .from("receipts")
      .upload(storagePath, compressedBuffer, { contentType: "image/jpeg" })
    if (uploadError) throw new Error(`Storage 업로드 실패: ${uploadError.message}`)

    try {
      const parsed = await runGeminiOcr(ocrBase64)

      const rawItems = Array.isArray(parsed.items) ? (parsed.items as ReceiptItem[]) : []
      const filtered: ReceiptItem[] = rawItems
        .filter((i) => i.total > 0 && (i.name?.length ?? 0) >= 1)
        .map((i) => ({
          name: i.name,
          unitPrice: i.unitPrice || i.total,
          qty: i.qty || 1,
          total: i.total,
        }))

      const parsedTotal = typeof parsed.totalAmount === "number" ? parsed.totalAmount : 0
      const totalAmount =
        parsedTotal > 0 ? parsedTotal : filtered.reduce((s, i) => s + i.total, 0)

      // 항목 합계와 최종 결제금액 보정
      // - 메뉴가 없고 금액만 있는 영수증: 결제금액으로 항목 1개 생성
      // - 단일 항목(공급가액만 인식 등): 항목 금액을 최종 결제금액으로 일치
      let items: ReceiptItem[]
      if (filtered.length === 0 && totalAmount > 0) {
        items = [{ name: "식대", unitPrice: totalAmount, qty: 1, total: totalAmount }]
      } else if (filtered.length === 1 && totalAmount > 0) {
        items = [{ name: filtered[0].name, unitPrice: totalAmount, qty: 1, total: totalAmount }]
      } else {
        items = filtered
      }

      const paidAt = (typeof parsed.paidAt === "string" && parsed.paidAt) ? parsed.paidAt : nowKST()
      const response: ParsedReceipt = {
        storeName: typeof parsed.storeName === "string" ? parsed.storeName : "",
        paidAt,
        items,
        totalAmount,
        isLunchTime: checkLunchTime(paidAt),
      }

      return NextResponse.json({ ...response, storagePath })
    } catch (ocrErr) {
      console.error("[Gemini OCR] all attempts failed", ocrErr)
      // 이미지는 업로드됐으므로 storagePath를 함께 반환
      return NextResponse.json({ error: "영수증 인식에 실패했습니다", storagePath, paidAt: nowKST() }, { status: 422 })
    }
  } catch (err) {
    console.error("[OCR upload]", err)
    return NextResponse.json({ error: "영수증 인식에 실패했습니다" }, { status: 500 })
  }
}
