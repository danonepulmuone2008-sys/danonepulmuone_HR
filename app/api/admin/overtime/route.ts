import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth"
import { countWorkingDays } from "@/lib/holidays"
import { fetchCompanyHolidaySet } from "@/lib/companyHolidays.server"

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

    const { searchParams } = new URL(req.url)
    const periodId = searchParams.get("periodId")

    if (!periodId) {
      return NextResponse.json({ configured: false })
    }

    // 기간 조회
    const { data: period, error: pErr } = await supabaseAdmin
      .from("overtime_periods")
      .select("*")
      .eq("id", periodId)
      .single()

    if (pErr || !period) {
      return NextResponse.json({ configured: false })
    }

    const { start_date: startDate, end_date: endDate, daily_work_hours: dailyWorkHours } = period

    const nowKST = new Date(new Date().getTime() + 9 * 60 * 60 * 1000)
    const kstDateStr = (d: Date) =>
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
    const todayStr = kstDateStr(nowKST)

    // 이번 주 기준: 이번 주 일요일까지
    const dayOfWeek = nowKST.getUTCDay()
    const endOfWeekKST = new Date(nowKST)
    endOfWeekKST.setUTCDate(nowKST.getUTCDate() + (dayOfWeek === 0 ? 0 : 7 - dayOfWeek))
    const endOfWeekStr = kstDateStr(endOfWeekKST)

    const periodExpectedEnd = endDate < endOfWeekStr ? endDate : endOfWeekStr
    const actualEnd = endDate < todayStr ? endDate : todayStr

    const companyHolidays = await fetchCompanyHolidaySet()

    // 총근무일 기준 기대 시간 (기간 전체)
    const totalExpectedHours = startDate > endDate
      ? 0
      : Math.round(countWorkingDays(startDate, endDate, companyHolidays) * dailyWorkHours * 10) / 10

    // 이번 주 기준 기대 시간
    const periodExpectedHours = startDate > periodExpectedEnd
      ? 0
      : Math.round(countWorkingDays(startDate, periodExpectedEnd, companyHolidays) * dailyWorkHours * 10) / 10

    if (startDate > actualEnd) {
      return NextResponse.json({
        configured: true, users: [], startDate, endDate, dailyWorkHours,
        periodExpectedHours, totalExpectedHours,
      })
    }

    // 배정된 직원 조회 (없으면 전체 활성 직원)
    const { data: assignedRows } = await supabaseAdmin
      .from("overtime_period_users")
      .select("user_id")
      .eq("period_id", periodId)

    const assignedIds = (assignedRows ?? []).map((r: { user_id: string }) => r.user_id)
    const useAllUsers = assignedIds.length === 0

    let usersQuery = supabaseAdmin
      .from("users")
      .select("id, name, use_session_tracking")
      .eq("is_active", true)
      .eq("role", "employee")
      .order("name", { ascending: true })

    if (!useAllUsers) {
      usersQuery = usersQuery.in("id", assignedIds)
    }

    const { data: users } = await usersQuery

    if (!users || users.length === 0) {
      return NextResponse.json({
        configured: true, users: [], startDate, endDate, dailyWorkHours,
        periodExpectedHours, totalExpectedHours,
      })
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
          vacCreditMap[vac.user_id] = (vacCreditMap[vac.user_id] ?? 0) + countWorkingDays(vacStart, vacEnd, companyHolidays) * dailyWorkHours
        }
      }
    }

    const result = users.map((u) => {
      const actualHours = Math.round(((attendanceMap[u.id] ?? 0) + (vacCreditMap[u.id] ?? 0)) * 10) / 10
      return { id: u.id, name: u.name, actualHours }
    })

    return NextResponse.json({
      configured: true,
      users: result,
      startDate,
      endDate,
      dailyWorkHours,
      periodExpectedHours,
      totalExpectedHours,
    })
  } catch (err) {
    console.error("[admin/overtime GET]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
