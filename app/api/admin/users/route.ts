import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(req: Request) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? ""
    if (!token) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const year = searchParams.get("year") ?? String(new Date().getFullYear())
    const month = searchParams.get("month") ?? String(new Date().getMonth() + 1)

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`
    const endDate = new Date(Number(year), Number(month), 1).toISOString().slice(0, 10)

    const { data: users, error: usersError } = await supabaseAdmin
      .from("users")
      .select("id, name, department, position, email, phone")
      .eq("is_active", true)
      .order("name")

    if (usersError) throw usersError

    // 해당 월 영수증 합계 per user
    const { data: receipts, error: receiptsError } = await supabaseAdmin
      .from("receipts")
      .select("uploader_id, total_amount")
      .gte("paid_at", startDate)
      .lt("paid_at", endDate)

    if (receiptsError) throw receiptsError

    const usageMap: Record<string, number> = {}
    for (const r of receipts ?? []) {
      usageMap[r.uploader_id] = (usageMap[r.uploader_id] ?? 0) + r.total_amount
    }

    const result = (users ?? []).map((u) => ({ ...u, used: usageMap[u.id] ?? 0 }))

    return NextResponse.json(result)
  } catch (err) {
    console.error("[admin/users]", err)
    return NextResponse.json({ error: "조회에 실패했습니다" }, { status: 500 })
  }
}
