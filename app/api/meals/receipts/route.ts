import { NextResponse } from "next/server"
import { supabase, supabaseAdmin } from "@/lib/supabase"

interface ItemPayload {
  name: string
  unitPrice: number
  qty: number
  total: number
  assigneeIds: string[]
}

interface SaveReceiptPayload {
  source?: "ocr" | "manual"
  storagePath?: string | null
  storeName: string
  paidAt: string
  totalAmount: number
  isLunchTime?: boolean
  ocrRaw?: object | null
  items: ItemPayload[]
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? ""
    if (!token) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const body: SaveReceiptPayload = await req.json()
    const { storagePath, storeName, paidAt, totalAmount, isLunchTime, ocrRaw, items } = body

    if (!items?.length) {
      return NextResponse.json({ error: "항목이 없습니다" }, { status: 400 })
    }

    // 담당자가 본인 외에 있으면 pending, 본인만이면 바로 approved
    const allAssigneeIds = items.flatMap((item) =>
      item.assigneeIds.length > 0 ? item.assigneeIds : [user.id]
    )
    const needsApproval = allAssigneeIds.some((id) => id !== user.id)
    const receiptStatus = needsApproval ? "pending" : "approved"

    const { data: receipt, error: receiptError } = await supabaseAdmin
      .from("receipts")
      .insert({
        uploader_id: user.id,
        image_path: storagePath ?? null,
        store_name: storeName || null,
        paid_at: paidAt,
        total_amount: totalAmount,
        is_lunch_time: isLunchTime ?? false,
        ocr_raw_response: ocrRaw ?? null,
        status: receiptStatus,
      })
      .select("id")
      .single()
    if (receiptError) throw new Error(`영수증 저장 실패: ${receiptError.message}`)

    // One receipt_item row per assignee per item
    const rows = items.flatMap((item) => {
      const ids = item.assigneeIds.length > 0 ? item.assigneeIds : [user.id]
      const perPrice = Math.round(item.total / ids.length)
      return ids.map((assigneeId) => ({
        receipt_id: receipt.id,
        assigned_user_id: assigneeId,
        item_name: item.name,
        unit_price: item.unitPrice,
        qty: item.qty,
        price: perPrice,
        status: assigneeId === user.id ? "approved" : "pending",
      }))
    })

    const { error: itemsError } = await supabaseAdmin.from("receipt_items").insert(rows)
    if (itemsError) throw new Error(`항목 저장 실패: ${itemsError.message}`)

    return NextResponse.json({ receiptId: receipt.id, needsApproval })
  } catch (err) {
    console.error("[receipts save]", err)
    return NextResponse.json({ error: "저장에 실패했습니다" }, { status: 500 })
  }
}
