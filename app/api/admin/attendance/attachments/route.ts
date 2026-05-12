import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const year = parseInt(url.searchParams.get("year") ?? String(new Date().getFullYear()))
  const month = parseInt(url.searchParams.get("month") ?? String(new Date().getMonth() + 1))

  const from = `${year}-${String(month).padStart(2, "0")}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`

  const { data, error } = await supabaseAdmin
    .from("vacation_requests")
    .select("id, user_id, type, start_date, end_date, status, created_at, attachment_url")
    .not("attachment_url", "is", null)
    .gte("created_at", from)
    .lte("created_at", to + "T23:59:59")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const userIds = [...new Set((data ?? []).map((r) => r.user_id))]
  let nameMap: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: users } = await supabaseAdmin.from("users").select("id, name").in("id", userIds)
    nameMap = Object.fromEntries((users ?? []).map((u) => [u.id, u.name]))
  }

  return NextResponse.json(
    (data ?? []).map((r) => ({
      id: r.id,
      user_name: nameMap[r.user_id] ?? "알 수 없음",
      type: r.type,
      start_date: r.start_date,
      end_date: r.end_date,
      status: r.status,
      created_at: r.created_at,
      attachment_url: r.attachment_url,
    }))
  )
}
