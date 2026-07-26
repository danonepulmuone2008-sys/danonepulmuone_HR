import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase-server"

export async function GET(req: Request) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? ""
    if (!token) return NextResponse.json({ error: "?몄쬆???꾩슂?⑸땲?? }, { status: 401 })

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: "?몄쬆???꾩슂?⑸땲?? }, { status: 401 })

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
        store_name: receipt?.store_name ?? "媛留뱀젏 誘몄씤??,
        paid_at: receipt?.paid_at ?? "",
        uploader_name: uploader?.name ?? "?????놁쓬",
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error("[pending]", err)
    return NextResponse.json({ error: "議고쉶???ㅽ뙣?덉뒿?덈떎" }, { status: 500 })
  }
}
