import { NextResponse } from "next/server"
import { supabase, supabaseAdmin } from "@/lib/supabase"
import { getMealLimit } from "@/lib/holidays"

export async function GET(req: Request) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? ""
    if (!token) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const startOfMonth = `${year}-${String(month).padStart(2, "0")}-01`
    const startOfNext = month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`

    // 이번 달 영수증 중 receipts.status = "approved" 인 것만
    const { data: receiptRows, error: receiptError } = await supabaseAdmin
      .from("receipts")
      .select("id")
      .eq("status", "approved")
      .gte("paid_at", startOfMonth)
      .lt("paid_at", startOfNext)
    if (receiptError) throw new Error(receiptError.message)

    const receiptIds = (receiptRows ?? []).map((r) => r.id)

    // 해당 영수증에서 나에게 할당된 항목의 price 합산
    const { data, error } = receiptIds.length > 0
      ? await supabaseAdmin
          .from("receipt_items")
          .select("price")
          .eq("assigned_user_id", user.id)
          .in("receipt_id", receiptIds)
      : { data: [], error: null }
    if (error) throw new Error(error.message)

    const used = (data ?? []).reduce((sum, r) => sum + (r.price ?? 0), 0)
    const totalLimit = getMealLimit(year, month)

    return NextResponse.json({ used, totalLimit })
  } catch (err) {
    console.error("[meals usage]", err)
    return NextResponse.json({ error: "조회에 실패했습니다" }, { status: 500 })
  }
}
