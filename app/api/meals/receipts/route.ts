import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ReceiptItemPayload {
  name: string
  unitPrice: number
  qty: number
  total: number
  assigneeId: string
}

interface SaveReceiptPayload {
  uploaderId: string
  storagePath: string
  storeName: string
  paidAt: string
  totalAmount: number
  isLunchTime: boolean
  ocrRaw: object
  items: ReceiptItemPayload[]
}

export async function POST(req: Request) {
  try {
    const body: SaveReceiptPayload = await req.json()
    const { uploaderId, storagePath, storeName, paidAt, totalAmount, isLunchTime, ocrRaw, items } = body

    if (!uploaderId || !storagePath || !items?.length) {
      return NextResponse.json({ error: "필수 데이터가 누락됐습니다" }, { status: 400 })
    }

    const { data: receipt, error: receiptError } = await supabaseAdmin
      .from("receipts")
      .insert({
        uploader_id: uploaderId,
        image_path: storagePath,
        store_name: storeName || null,
        paid_at: paidAt,
        total_amount: totalAmount,
        is_lunch_time: isLunchTime,
        ocr_raw_response: ocrRaw,
      })
      .select("id")
      .single()
    if (receiptError) throw new Error(`영수증 저장 실패: ${receiptError.message}`)

    const { error: itemsError } = await supabaseAdmin.from("receipt_items").insert(
      items.map((item) => ({
        receipt_id: receipt.id,
        assigned_user_id: item.assigneeId,
        item_name: item.name,
        unit_price: item.unitPrice,
        qty: item.qty,
        price: item.total,
      }))
    )
    if (itemsError) throw new Error(`항목 저장 실패: ${itemsError.message}`)

    return NextResponse.json({ receiptId: receipt.id })
  } catch (err) {
    console.error("[receipts save]", err)
    return NextResponse.json({ error: "저장에 실패했습니다" }, { status: 500 })
  }
}
