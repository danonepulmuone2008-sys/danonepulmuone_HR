import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireUser, requireAdmin } from "@/lib/auth"

export async function GET(req: Request) {
  try {
    const auth = await requireUser(req)
    if (!auth.ok) return auth.response

    const { data, error } = await supabaseAdmin
      .from("overtime_settings")
      .select("key, value")

    if (error) throw error

    const map = Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]))

    return NextResponse.json({
      daily_work_hours: Number(map.daily_work_hours ?? 8),
      start_date: map.start_date ?? "",
      end_date: map.end_date ?? "",
      mode: (map.mode ?? "monthly") as "monthly" | "custom",
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response

    if (auth.profile.role !== "admin") {
      return NextResponse.json({ error: "admin 권한이 필요합니다" }, { status: 403 })
    }

    const body = await req.json()
    const { daily_work_hours, start_date, end_date, mode } = body

    const updates: { key: string; value: string }[] = []
    if (daily_work_hours !== undefined) updates.push({ key: "daily_work_hours", value: String(daily_work_hours) })
    if (start_date !== undefined) updates.push({ key: "start_date", value: start_date })
    if (end_date !== undefined) updates.push({ key: "end_date", value: end_date })
    if (mode !== undefined) updates.push({ key: "mode", value: mode })

    for (const u of updates) {
      const { error } = await supabaseAdmin
        .from("overtime_settings")
        .upsert({ key: u.key, value: u.value }, { onConflict: "key" })
      if (error) throw error
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
