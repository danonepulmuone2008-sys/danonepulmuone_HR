import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAdmin } from "@/lib/auth"

const KST = 9 * 60 * 60 * 1000

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    const year   = parseInt(searchParams.get("year")  ?? String(new Date().getFullYear()))
    const month  = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1))

    if (!userId) return NextResponse.json({ error: "userId 필요" }, { status: 400 })

    const startOfMonth = new Date(Date.UTC(year, month - 1, 1) - KST).toISOString()
    const startOfNext  = new Date(Date.UTC(year, month,     1) - KST).toISOString()

    const [{ data: sent }, { data: received }] = await Promise.all([
      supabaseAdmin.from("meal_transfers")
        .select("id, to_user_id, amount, note, status, created_at, responded_at")
        .eq("from_user_id", userId)
        .gte("created_at", startOfMonth)
        .lt("created_at", startOfNext)
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("meal_transfers")
        .select("id, from_user_id, amount, note, status, created_at, responded_at")
        .eq("to_user_id", userId)
        .gte("created_at", startOfMonth)
        .lt("created_at", startOfNext)
        .order("created_at", { ascending: false }),
    ])

    const userIds = [
      ...new Set([
        ...(sent ?? []).map(t => t.to_user_id),
        ...(received ?? []).map(t => t.from_user_id),
      ])
    ]
    const { data: users } = userIds.length > 0
      ? await supabaseAdmin.from("users").select("id, name").in("id", userIds)
      : { data: [] }
    const userMap = Object.fromEntries((users ?? []).map(u => [u.id, u.name]))

    return NextResponse.json({
      sent: (sent ?? []).map(t => ({
        id: t.id,
        to_name: userMap[t.to_user_id] ?? "알 수 없음",
        amount: t.amount,
        note: t.note,
        status: t.status,
        created_at: t.created_at,
        responded_at: t.responded_at,
      })),
      received: (received ?? []).map(t => ({
        id: t.id,
        from_name: userMap[t.from_user_id] ?? "알 수 없음",
        amount: t.amount,
        note: t.note,
        status: t.status,
        created_at: t.created_at,
        responded_at: t.responded_at,
      })),
    })
  } catch (err) {
    console.error("[admin/meals/user-transfers]", err)
    return NextResponse.json({ error: "조회에 실패했습니다" }, { status: 500 })
  }
}
