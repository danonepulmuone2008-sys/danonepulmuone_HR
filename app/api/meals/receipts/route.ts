import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase-server"

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

export async function GET(req: Request) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? ""
    if (!token) return NextResponse.json({ error: "?몄쬆???꾩슂?⑸땲?? }, { status: 401 })

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: "?몄쬆???꾩슂?⑸땲?? }, { status: 401 })

    // ?닿? ?щ┛ ?곸닔利?
    const { data: uploaded } = await supabaseAdmin
      .from("receipts")
      .select("id, store_name, paid_at, total_amount, status")
      .eq("uploader_id", user.id)

    // ?닿? ?대떦?먮줈 吏?뺣맂 receipt_items (price ?⑹궛??
    const { data: myItems } = await supabaseAdmin
      .from("receipt_items")
      .select("receipt_id, price")
      .eq("assigned_user_id", user.id)

    // receipt_id蹂???price ?⑷퀎
    const myAmountMap: Record<string, number> = {}
    for (const item of myItems ?? []) {
      myAmountMap[item.receipt_id] = (myAmountMap[item.receipt_id] ?? 0) + (item.price ?? 0)
    }

    const uploadedIds = new Set((uploaded ?? []).map((r) => r.id))
    const assignedIds = [...new Set((myItems ?? []).map((i) => i.receipt_id))]
      .filter((id) => !uploadedIds.has(id))

    let assigned: typeof uploaded = []
    if (assignedIds.length > 0) {
      const { data } = await supabaseAdmin
        .from("receipts")
        .select("id, store_name, paid_at, total_amount, status")
        .in("id", assignedIds)
      assigned = data ?? []
    }

    const all = [...(uploaded ?? []), ...assigned]
      .sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())
      .map((r) => ({ ...r, my_amount: myAmountMap[r.id] ?? r.total_amount }))

    return NextResponse.json(all)
  } catch (err) {
    console.error("[receipts list]", err)
    return NextResponse.json({ error: "議고쉶???ㅽ뙣?덉뒿?덈떎" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? ""
    if (!token) return NextResponse.json({ error: "?몄쬆???꾩슂?⑸땲?? }, { status: 401 })

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: "?몄쬆???꾩슂?⑸땲?? }, { status: 401 })

    const body: SaveReceiptPayload = await req.json()
    const { source, storagePath, storeName, paidAt, totalAmount, ocrRaw, items } = body

    if (!items?.length) {
      return NextResponse.json({ error: "??ぉ???놁뒿?덈떎" }, { status: 400 })
    }

    // ?대떦?먭? 蹂몄씤 ?몄뿉 ?덉쑝硫?pending, 蹂몄씤留뚯씠硫?諛붾줈 approved
    const allAssigneeIds = items.flatMap((item) =>
      item.assigneeIds.length > 0 ? item.assigneeIds : [user.id]
    )
    const needsApproval = allAssigneeIds.some((id) => id !== user.id)
    const receiptStatus = needsApproval ? "pending" : "approved"

    const { data: receipt, error: receiptError } = await supabaseAdmin
      .from("receipts")
      .insert({
        uploader_id: user.id,
        source: source ?? "manual",
        image_path: storagePath ?? null,
        store_name: storeName || null,
        paid_at: paidAt,
        total_amount: totalAmount,
        is_lunch_time: checkLunchTime(paidAt),
        ocr_raw_response: ocrRaw ?? null,
        status: receiptStatus,
      })
      .select("id")
      .single()
    if (receiptError) throw new Error(`?곸닔利?????ㅽ뙣: ${receiptError.message}`)

    // One receipt_item row per assignee per item
    const now = new Date().toISOString()
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
        responded_at: assigneeId === user.id ? now : null,
      }))
    })

    const { error: itemsError } = await supabaseAdmin.from("receipt_items").insert(rows)
    if (itemsError) throw new Error(`??ぉ ????ㅽ뙣: ${itemsError.message}`)

    return NextResponse.json({ receiptId: receipt.id, needsApproval })
  } catch (err) {
    console.error("[receipts save]", err)
    return NextResponse.json({ error: "??μ뿉 ?ㅽ뙣?덉뒿?덈떎" }, { status: 500 })
  }
}
