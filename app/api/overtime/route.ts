import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireUser } from "@/lib/auth"
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
    const auth = await requireUser(req)
    if (!auth.ok) return auth.response

    const userId = auth.user.id
    const url = new URL(req.url)
    const basis = url.searchParams.get("basis") ?? "today"
    const periodIdParam = url.searchParams.get("periodId")

    const nowKST = new Date(new Date().getTime() + 9 * 60 * 60 * 1000)
    const kstDateStr = (d: Date) =>
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
    const todayStr = kstDateStr(nowKST)

    const { data: allPeriods } = await supabaseAdmin
      .from("overtime_periods")
      .select("*, overtime_period_users(user_id)")
      .order("start_date", { ascending: false })

    if (!allPeriods || allPeriods.length === 0) {
      return NextResponse.json({ configured: false })
    }

    // 사용자가 속하는 기간 필터: 명시 배정됐거나 배정이 없는(전체 적용) 기간
    const eligiblePeriods = allPeriods.filter((p: any) => {
      const assignedIds = (p.overtime_period_users ?? []).map((r: any) => r.user_id)
      return assignedIds.length === 0 || assignedIds.includes(userId)
    })

    if (eligiblePeriods.length === 0) {
      return NextResponse.json({ configured: false })
    }

    const periodSummaries = eligiblePeriods.map((p: any) => ({
      id: p.id,
      name: p.name,
      start_date: p.start_date,
      end_date: p.end_date,
    }))

    // periodId 지정 시 해당 기간 사용, 없으면 자동 선택
    const activePeriod = (periodIdParam
      ? eligiblePeriods.find((p: any) => p.id === periodIdParam)
      : null)
      ?? eligiblePeriods.find((p: any) => p.start_date <= todayStr && p.end_date >= todayStr)
      ?? eligiblePeriods[0]

    const { id: periodId, start_date: startDate, end_date: endDate, daily_work_hours: dailyWorkHours } = activePeriod

    let effectiveEnd: string
    if (basis === "week") {
      const dow = nowKST.getUTCDay()
      const endOfWeekKST = new Date(nowKST)
      endOfWeekKST.setUTCDate(nowKST.getUTCDate() + (dow === 0 ? 0 : 7 - dow))
      effectiveEnd = endDate < kstDateStr(endOfWeekKST) ? endDate : kstDateStr(endOfWeekKST)
    } else {
      effectiveEnd = endDate < todayStr ? endDate : todayStr
    }

    if (startDate > effectiveEnd) {
      return NextResponse.json({ configured: true, overtimeHours: 0, expectedHours: 0, actualHours: 0, startDate, endDate, dailyWorkHours })
    }

    const companyHolidays = await fetchCompanyHolidaySet()
    const expectedHours = countWorkingDays(startDate, effectiveEnd, companyHolidays) * dailyWorkHours

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

      actualAttendanceHours = (sessions ?? []).reduce((sum: number, s: any) =>
        sum + calcSessionHours(s.start_time, s.end_time, s.lunch_break), 0)
    } else {
      const { data: records } = await supabaseAdmin
        .from("attendance_records")
        .select("clock_in, clock_out, lunch_break")
        .eq("user_id", userId)
        .gte("date", startDate)
        .lte("date", effectiveEnd)

      actualAttendanceHours = (records ?? []).reduce((sum: number, r: any) =>
        sum + calcRecordHours(r.clock_in, r.clock_out, r.lunch_break), 0)
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
          vacationCreditHours += countWorkingDays(vacStart, vacEnd, companyHolidays) * dailyWorkHours
        }
      }
    }

    const actualHours = actualAttendanceHours + vacationCreditHours
    const overtimeHours = Math.round((actualHours - expectedHours) * 10) / 10

    return NextResponse.json({
      configured: true,
      periodId,
      periods: periodSummaries,
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
