import { NextResponse } from "next/server"
import { supabase, supabaseAdmin } from "@/lib/supabase"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? ""
    if (!token) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const { id } = await params

    const { data: receipt, error: receiptError } = await supabaseAdmin
      .from("receipts")
      .select("id, store_name, paid_at, total_amount, is_lunch_time, status, image_path, uploader_id")
      .eq("id", id)
      .single()
    if (receiptError || !receipt) return NextResponse.json({ error: "영수증 없음" }, { status: 404 })

    // 요청자 본인이거나 항목 담당자여야 조회 가능
    const { data: myItem } = await supabaseAdmin
      .from("receipt_items")
      .select("id")
      .eq("receipt_id", id)
      .eq("assigned_user_id", user.id)
      .limit(1)
      .maybeSingle()

    if (receipt.uploader_id !== user.id && !myItem) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    const { data: uploaderRow } = await supabaseAdmin
      .from("users")
      .select("name")
      .eq("id", receipt.uploader_id)
      .single()

    const { data: itemRows } = await supabaseAdmin
      .from("receipt_items")
      .select("id, item_name, unit_price, qty, price, status, responded_at, assigned_user_id")
      .eq("receipt_id", id)

    const assigneeIds = [...new Set((itemRows ?? []).map((i) => i.assigned_user_id))]
    const { data: userRows } = assigneeIds.length > 0
      ? await supabaseAdmin.from("users").select("id, name").in("id", assigneeIds)
      : { data: [] }

    const userMap = Object.fromEntries((userRows ?? []).map((u) => [u.id, u.name]))

    return NextResponse.json({
      id: receipt.id,
      store_name: receipt.store_name,
      paid_at: receipt.paid_at,
      total_amount: receipt.total_amount,
      is_lunch_time: receipt.is_lunch_time,
      status: receipt.status,
      image_path: receipt.image_path,
      uploader_name: uploaderRow?.name ?? "알 수 없음",
      items: (itemRows ?? []).map((item) => ({
        id: item.id,
        item_name: item.item_name,
        unit_price: item.unit_price,
        qty: item.qty,
        price: item.price,
        status: item.status,
        responded_at: item.responded_at,
        assignee_name: userMap[item.assigned_user_id] ?? "알 수 없음",
      })),
    })
  } catch (err) {
    console.error("[receipt detail]", err)
    return NextResponse.json({ error: "조회에 실패했습니다" }, { status: 500 })
  }
}
