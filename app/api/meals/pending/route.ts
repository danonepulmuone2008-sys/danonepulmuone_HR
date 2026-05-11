import { NextResponse } from "next/server"
import { supabase, supabaseAdmin } from "@/lib/supabase"

export async function GET(req: Request) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? ""
    if (!token) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const { data: items } = await supabaseAdmin
      .from("receipt_items")
      .select("id, item_name, price, receipt_id")
      .eq("assigned_user_id", user.id)
      .eq("status", "pending")

    if (!items?.length) return NextResponse.json([])

    const receiptIds = [...new Set(items.map((i) => i.receipt_id))]
    const { data: receiptRows } = await supabaseAdmin
      .from("receipts")
      .select("id, store_name, paid_at, uploader_id")
      .in("id", receiptIds)

    const uploaderIds = [...new Set((receiptRows ?? []).map((r) => r.uploader_id))]
    const { data: uploaderRows } = await supabaseAdmin
      .from("users")
      .select("id, name")
      .in("id", uploaderIds)

    const result = items.map((item) => {
      const receipt = receiptRows?.find((r) => r.id === item.receipt_id)
      const uploader = uploaderRows?.find((u) => u.id === receipt?.uploader_id)
      return {
        id: item.id,
        item_name: item.item_name,
        price: item.price,
        receipt_id: item.receipt_id,
        store_name: receipt?.store_name ?? "가맹점 미인식",
        paid_at: receipt?.paid_at ?? "",
        uploader_name: uploader?.name ?? "알 수 없음",
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error("[pending]", err)
    return NextResponse.json({ error: "조회에 실패했습니다" }, { status: 500 })
  }
}
