import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireUser } from "@/lib/auth"
import { countWorkingDays } from "@/lib/holidays"

function calcRecordHours(clockIn: string | null, clockOut: string | null, lunchBreak: boolean | null): number {
  if (!clockIn || !clockOut) return 0
  const diff = (new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 3600000
  if (diff <= 0) return 0
  return lunchBreak ? Math.max(0, diff - 1) : diff
}

function calcSessionHours(startTime: string, endTime: string, lunchBreak: boolean): number {
  const diff = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 3600000
  if (diff <= 0) return 0
  return lunchBreak && diff >= 1 ? diff - 1 : diff
}

export async function GET(req: Request) {
  try {
    const auth = await requireUser(req)
    if (!auth.ok) return auth.response

    const userId = auth.user.id

    const { data: settingsRows } = await supabaseAdmin
      .from("overtime_settings")
      .select("key, value")

    const settings = Object.fromEntries((settingsRows ?? []).map((r: { key: string; value: string }) => [r.key, r.value]))
    const dailyWorkHours = Number(settings.daily_work_hours ?? 8)
    const mode: "monthly" | "custom" = (settings.mode ?? "monthly") as "monthly" | "custom"

    let startDate: string
    let endDate: string

    if (mode === "monthly") {
      const nowKST = new Date(new Date().getTime() + 9 * 60 * 60 * 1000)
      const y = nowKST.getUTCFullYear()
      const m = nowKST.getUTCMonth()
      const mm = String(m + 1).padStart(2, "0")
      startDate = `${y}-${mm}-01`
      endDate = `${y}-${mm}-${String(new Date(Date.UTC(y, m + 1, 0)).getUTCDate()).padStart(2, "0")}`
    } else {
      startDate = settings.start_date ?? ""
      endDate = settings.end_date ?? ""
      if (!startDate || !endDate) return NextResponse.json({ configured: false })
    }

    const url = new URL(req.url)
    const basis = url.searchParams.get("basis") ?? "today"

    const nowKST = new Date(new Date().getTime() + 9 * 60 * 60 * 1000)
    const kstDateStr = (d: Date) =>
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`

    let effectiveEnd: string
    if (basis === "week") {
      const dow = nowKST.getUTCDay()
      const endOfWeekKST = new Date(nowKST)
      endOfWeekKST.setUTCDate(nowKST.getUTCDate() + (dow === 0 ? 0 : 7 - dow))
      effectiveEnd = endDate < kstDateStr(endOfWeekKST) ? endDate : kstDateStr(endOfWeekKST)
    } else {
      const today = kstDateStr(nowKST)
      effectiveEnd = endDate < today ? endDate : today
    }

    if (startDate > effectiveEnd) {
      return NextResponse.json({ configured: true, overtimeHours: 0, expectedHours: 0, actualHours: 0, startDate, endDate, dailyWorkHours })
    }

    const expectedHours = countWorkingDays(startDate, effectiveEnd) * dailyWorkHours

    const { data: userProfile } = await supabaseAdmin
      .from("users")
      .select("use_session_tracking")
      .eq("id", userId)
      .maybeSingle()

    const useSessionTracking = userProfile?.use_session_tracking ?? false

    let actualAttendanceHours = 0

    if (useSessionTracking) {
      const { data: sessions } = await supabaseAdmin
        .from("work_sessions")
        .select("start_time, end_time, lunch_break")
        .eq("user_id", userId)
        .gte("date", startDate)
        .lte("date", effectiveEnd)
        .not("end_time", "is", null)

      actualAttendanceHours = (sessions ?? []).reduce((sum: number, s: { start_time: string; end_time: string; lunch_break: boolean }) => {
        return sum + calcSessionHours(s.start_time, s.end_time, s.lunch_break)
      }, 0)
    } else {
      const { data: records } = await supabaseAdmin
        .from("attendance_records")
        .select("clock_in, clock_out, lunch_break")
        .eq("user_id", userId)
        .gte("date", startDate)
        .lte("date", effectiveEnd)

      actualAttendanceHours = (records ?? []).reduce((sum: number, r: { clock_in: string | null; clock_out: string | null; lunch_break: boolean | null }) => {
        return sum + calcRecordHours(r.clock_in, r.clock_out, r.lunch_break)
      }, 0)
    }

    const { data: vacations } = await supabaseAdmin
      .from("vacation_requests")
      .select("type, start_date, end_date, hours")
      .eq("user_id", userId)
      .eq("status", "approved")
      .lte("start_date", effectiveEnd)
      .gte("end_date", startDate)

    const CREDIT_TYPES = ["면접", "병가", "경조사"]
    let vacationCreditHours = 0

    for (const vac of vacations ?? []) {
      if (vac.type === "시간 휴가") {
        vacationCreditHours += vac.hours ?? 0
      } else if (CREDIT_TYPES.includes(vac.type)) {
        const vacStart = vac.start_date > startDate ? vac.start_date : startDate
        const vacEnd = vac.end_date < effectiveEnd ? vac.end_date : effectiveEnd
        if (vacStart <= vacEnd) {
          vacationCreditHours += countWorkingDays(vacStart, vacEnd) * dailyWorkHours
        }
      }
    }

    const actualHours = actualAttendanceHours + vacationCreditHours
    const overtimeHours = Math.round((actualHours - expectedHours) * 10) / 10

    return NextResponse.json({
      configured: true,
      overtimeHours,
      expectedHours: Math.round(expectedHours * 10) / 10,
      actualHours: Math.round(actualHours * 10) / 10,
      startDate,
      endDate,
      dailyWorkHours,
    })
  } catch (err) {
    console.error("[overtime GET]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
