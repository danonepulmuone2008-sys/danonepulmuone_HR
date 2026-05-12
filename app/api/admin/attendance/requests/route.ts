import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

function decodeJwtSub(token: string): string | null {
  try {
    const parts = token.split(".")
    if (parts.length < 2) return null
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, "=")
    const decoded = JSON.parse(Buffer.from(padded, "base64").toString("utf-8"))
    return decoded.sub ?? null
  } catch {
    return null
  }
}

export async function GET(req: Request) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? ""
    if (!token) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const userId = decodeJwtSub(token)
    if (!userId) return NextResponse.json({ error: "JWT 디코딩 실패" }, { status: 401 })

    const url = new URL(req.url)
    const history = url.searchParams.get("history") === "true"
    const statusFilter = history ? ["approved", "rejected"] : ["pending"]

    const [tripRes, vacRes, editRes] = await Promise.all([
      supabaseAdmin
        .from("business_trip_requests")
        .select("id, user_id, destination, start_date, end_date, start_time, end_time, reason, status, created_at")
        .in("status", statusFilter)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("vacation_requests")
        .select("id, user_id, type, start_date, end_date, reason, status, created_at, attachment_url")
        .in("status", statusFilter)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("attendance_edit_requests")
        .select("id, user_id, date, direction, requested_time, reason, requested_at, status")
        .in("status", statusFilter)
        .order("requested_at", { ascending: false }),
    ])

    if (tripRes.error) console.error("[trips]", tripRes.error.message)
    if (vacRes.error) console.error("[vacs]", vacRes.error.message)
    if (editRes.error) console.error("[edits]", editRes.error.message)

    const allUserIds = [
      ...(tripRes.data ?? []).map((r) => r.user_id),
      ...(vacRes.data ?? []).map((r) => r.user_id),
      ...(editRes.data ?? []).map((r) => r.user_id),
    ]
    const uniqueIds = [...new Set(allUserIds)]

    let nameMap: Record<string, string> = {}
    if (uniqueIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from("users")
        .select("id, name")
        .in("id", uniqueIds)
      nameMap = Object.fromEntries((users ?? []).map((u) => [u.id, u.name]))
    }

    const trips = (tripRes.data ?? []).map((r) => ({
      id: r.id,
      type: "business_trip" as const,
      status: r.status as string,
      user_id: r.user_id,
      user_name: nameMap[r.user_id] ?? "알 수 없음",
      start_date: r.start_date,
      end_date: r.end_date,
      start_time: r.start_time,
      end_time: r.end_time,
      destination: r.destination,
      reason: r.reason,
      requested_at: r.created_at,
    }))

    const vacs = (vacRes.data ?? []).map((r) => ({
      id: r.id,
      type: "vacation" as const,
      status: r.status as string,
      user_id: r.user_id,
      user_name: nameMap[r.user_id] ?? "알 수 없음",
      start_date: r.start_date,
      end_date: r.end_date,
      label: r.type,
      reason: r.reason,
      attachment_url: r.attachment_url as string | null,
      requested_at: r.created_at,
    }))

    const edits = (editRes.data ?? []).map((r) => ({
      id: r.id,
      type: "attendance_edit" as const,
      status: r.status as string,
      user_id: r.user_id,
      user_name: nameMap[r.user_id] ?? "알 수 없음",
      date: r.date,
      direction: r.direction as "in" | "out",
      requested_time: r.requested_time,
      reason: r.reason,
      requested_at: r.requested_at,
    }))

    const all = [...trips, ...vacs, ...edits].sort(
      (a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime()
    )

    return NextResponse.json(all)
  } catch (err) {
    console.error("[admin attendance requests]", err)
    return NextResponse.json({ error: "조회에 실패했습니다" }, { status: 500 })
  }
}
