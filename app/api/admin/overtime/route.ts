import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth"
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
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response

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

    const nowKST = new Date(new Date().getTime() + 9 * 60 * 60 * 1000)
    const kstDateStr = (d: Date) =>
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
    const todayStr = kstDateStr(nowKST)

    // 기준(expected): 월단위는 월 전체, 직접설정은 금주까지
    // 실근무(actual): 항상 오늘까지만 집계
    let expectedEnd: string
    let actualEnd: string

    if (mode === "monthly") {
      expectedEnd = endDate  // 월 말일 기준으로 전체 영업일 산정
      actualEnd = endDate < todayStr ? endDate : todayStr
    } else {
      const dayOfWeek = nowKST.getUTCDay()
      const endOfWeekKST = new Date(nowKST)
      endOfWeekKST.setUTCDate(nowKST.getUTCDate() + (dayOfWeek === 0 ? 0 : 7 - dayOfWeek))
      const endOfWeekStr = kstDateStr(endOfWeekKST)
      expectedEnd = endDate < endOfWeekStr ? endDate : endOfWeekStr
      actualEnd = expectedEnd
    }

    // 총근무일 기준: 설정 기간 전체(startDate ~ endDate)의 공휴일 제외 근로일수 × 하루 기본 근무시간
    const totalExpectedHours = startDate > endDate
      ? 0
      : Math.round(countWorkingDays(startDate, endDate) * dailyWorkHours * 10) / 10

    if (startDate > expectedEnd) {
      return NextResponse.json({ configured: true, users: [], startDate, endDate, dailyWorkHours, expectedHours: 0, totalExpectedHours })
    }

    const expectedHours = countWorkingDays(startDate, expectedEnd) * dailyWorkHours

    const { data: users } = await supabaseAdmin
      .from("users")
      .select("id, name, use_session_tracking")
      .eq("is_active", true)
      .eq("role", "employee")
      .order("name", { ascending: true })

    if (!users || users.length === 0) {
      return NextResponse.json({ configured: true, users: [], startDate, endDate, dailyWorkHours, expectedHours: Math.round(expectedHours * 10) / 10 })
    }

    const userIds = users.map((u) => u.id)
    const sessionUserIds = users.filter((u) => u.use_session_tracking).map((u) => u.id)
    const normalUserIds = users.filter((u) => !u.use_session_tracking).map((u) => u.id)

    const attendanceMap: Record<string, number> = {}

    if (normalUserIds.length > 0) {
      const { data: records } = await supabaseAdmin
        .from("attendance_records")
        .select("user_id, clock_in, clock_out, lunch_break")
        .in("user_id", normalUserIds)
        .gte("date", startDate)
        .lte("date", actualEnd)

      for (const r of records ?? []) {
        attendanceMap[r.user_id] = (attendanceMap[r.user_id] ?? 0) + calcRecordHours(r.clock_in, r.clock_out, r.lunch_break)
      }
    }

    if (sessionUserIds.length > 0) {
      const { data: sessions } = await supabaseAdmin
        .from("work_sessions")
        .select("user_id, start_time, end_time, lunch_break")
        .in("user_id", sessionUserIds)
        .gte("date", startDate)
        .lte("date", actualEnd)
        .not("end_time", "is", null)

      for (const s of sessions ?? []) {
        attendanceMap[s.user_id] = (attendanceMap[s.user_id] ?? 0) + calcSessionHours(s.start_time, s.end_time, s.lunch_break)
      }
    }

    const { data: vacations } = await supabaseAdmin
      .from("vacation_requests")
      .select("user_id, type, start_date, end_date, hours")
      .in("user_id", userIds)
      .eq("status", "approved")
      .lte("start_date", actualEnd)
      .gte("end_date", startDate)

    const CREDIT_TYPES = ["면접", "병가", "경조사"]
    const vacCreditMap: Record<string, number> = {}

    for (const vac of vacations ?? []) {
      if (vac.type === "시간 휴가") {
        vacCreditMap[vac.user_id] = (vacCreditMap[vac.user_id] ?? 0) + (vac.hours ?? 0)
      } else if (CREDIT_TYPES.includes(vac.type)) {
        const vacStart = vac.start_date > startDate ? vac.start_date : startDate
        const vacEnd = vac.end_date < actualEnd ? vac.end_date : actualEnd
        if (vacStart <= vacEnd) {
          vacCreditMap[vac.user_id] = (vacCreditMap[vac.user_id] ?? 0) + countWorkingDays(vacStart, vacEnd) * dailyWorkHours
        }
      }
    }

    const result = users.map((u) => {
      const actualHours = (attendanceMap[u.id] ?? 0) + (vacCreditMap[u.id] ?? 0)
      const overtimeHours = Math.round((actualHours - expectedHours) * 10) / 10
      return {
        id: u.id,
        name: u.name,
        actualHours: Math.round(actualHours * 10) / 10,
        expectedHours: Math.round(expectedHours * 10) / 10,
        overtimeHours,
      }
    })

    return NextResponse.json({
      configured: true,
      users: result,
      startDate,
      endDate,
      dailyWorkHours,
      expectedHours: Math.round(expectedHours * 10) / 10,
      totalExpectedHours,
      mode,
    })
  } catch (err) {
    console.error("[admin/overtime GET]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
