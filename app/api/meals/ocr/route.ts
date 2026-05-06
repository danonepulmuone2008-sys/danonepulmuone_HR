import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

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
- items는 실제 구매 상품만 포함 (합계·부가세·할인·쿠폰·과세 등 제외)
- 금액은 숫자만 (원 기호·쉼표 없이)
- qty 없으면 1, unitPrice 없으면 total 값과 동일하게`

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

function checkLunchTime(isoString: string | null): boolean {
  if (!isoString) return false
  try {
    const date = new Date(isoString)
    const kstMins = (date.getUTCHours() * 60 + date.getUTCMinutes() + 9 * 60) % (24 * 60)
    return kstMins >= 11 * 60 + 30 && kstMins <= 14 * 60
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("image") as File
    if (!file) return NextResponse.json({ error: "이미지가 없습니다" }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = buffer.toString("base64")
    const mimeType = file.type as "image/jpeg" | "image/png" | "image/webp"

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    const result = await model.generateContent([
      { inlineData: { data: base64, mimeType } },
      PROMPT,
    ])

    const text = result.response.text().trim()
    // 마크다운 코드블록 제거
    const json = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
    const parsed = JSON.parse(json)

    const items: ReceiptItem[] = (parsed.items ?? [])
      .filter((i: ReceiptItem) => i.total > 0 && i.name?.length >= 2)
      .map((i: ReceiptItem) => ({
        name: i.name,
        unitPrice: i.unitPrice || i.total,
        qty: i.qty || 1,
        total: i.total,
      }))

    const totalAmount =
      parsed.totalAmount || items.reduce((s: number, i: ReceiptItem) => s + i.total, 0)

    const response: ParsedReceipt = {
      storeName: parsed.storeName ?? "",
      paidAt: parsed.paidAt ?? new Date().toISOString(),
      items,
      totalAmount,
      isLunchTime: checkLunchTime(parsed.paidAt),
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error("[Gemini OCR]", err)
    return NextResponse.json({ error: "영수증 인식에 실패했습니다" }, { status: 500 })
  }
}
