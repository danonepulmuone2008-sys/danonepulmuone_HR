import { NextResponse } from "next/server"
import { supabase, supabaseAdmin } from "@/lib/supabase"

export async function GET(req: Request) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? ""
    if (!token) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const { data: { user } } = await supabase.auth.getUser(token)
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
      .eq("role", "employee")
      .order("name")

    if (usersError) throw usersError

    // 해당 월 approved 영수증 ID 수집
    const { data: approvedReceipts, error: receiptsError } = await supabaseAdmin
      .from("receipts")
      .select("id")
      .eq("status", "approved")
      .gte("paid_at", startDate)
      .lt("paid_at", endDate)

    if (receiptsError) throw receiptsError

    const approvedIds = (approvedReceipts ?? []).map((r) => r.id)

    // 해당 영수증에서 각 사용자에게 배정된 price 합산
    const usageMap: Record<string, number> = {}
    if (approvedIds.length > 0) {
      const { data: items, error: itemsError } = await supabaseAdmin
        .from("receipt_items")
        .select("assigned_user_id, price")
        .in("receipt_id", approvedIds)

      if (itemsError) throw itemsError

      for (const item of items ?? []) {
        usageMap[item.assigned_user_id] = (usageMap[item.assigned_user_id] ?? 0) + (item.price ?? 0)
      }
    }

    const result = (users ?? []).map((u) => ({ ...u, used: usageMap[u.id] ?? 0 }))

    return NextResponse.json(result)
  } catch (err) {
    console.error("[admin/users]", err)
    return NextResponse.json({ error: "조회에 실패했습니다" }, { status: 500 })
  }
}
