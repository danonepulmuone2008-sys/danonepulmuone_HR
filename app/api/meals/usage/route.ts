import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase-server"
import { getMealLimit } from "@/lib/holidays"

export async function GET(req: Request) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? ""
    if (!token) return NextResponse.json({ error: "?몄쬆???꾩슂?⑸땲?? }, { status: 401 })

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: "?몄쬆???꾩슂?⑸땲?? }, { status: 401 })

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const startOfMonth = `${year}-${String(month).padStart(2, "0")}-01`
    const startOfNext = month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`

    // ?대쾲 ???곸닔利?以?receipts.status = "approved" ??寃껊쭔
    const { data: receiptRows, error: receiptError } = await supabaseAdmin
      .from("receipts")
      .select("id")
      .eq("status", "approved")
      .gte("paid_at", startOfMonth)
      .lt("paid_at", startOfNext)
    if (receiptError) throw new Error(receiptError.message)

    const receiptIds = (receiptRows ?? []).map((r) => r.id)

    // ?대떦 ?곸닔利앹뿉???섏뿉寃??좊떦????ぉ??price ?⑹궛
    const { data, error } = receiptIds.length > 0
      ? await supabaseAdmin
          .from("receipt_items")
          .select("price")
          .eq("assigned_user_id", user.id)
          .in("receipt_id", receiptIds)
      : { data: [], error: null }
    if (error) throw new Error(error.message)

    const used = (data ?? []).reduce((sum, r) => sum + (r.price ?? 0), 0)

    const targetMonth = `${year}-${String(month).padStart(2, "0")}-01`
    const { data: limitRow } = await supabaseAdmin
      .from("monthly_meal_limits")
      .select("monthly_meal_limit")
      .eq("target_month", targetMonth)
      .maybeSingle()
    const totalLimit = limitRow?.monthly_meal_limit ?? getMealLimit(year, month)

    return NextResponse.json({ used, totalLimit })
  } catch (err) {
    console.error("[meals usage]", err)
    return NextResponse.json({ error: "議고쉶???ㅽ뙣?덉뒿?덈떎" }, { status: 500 })
  }
}
