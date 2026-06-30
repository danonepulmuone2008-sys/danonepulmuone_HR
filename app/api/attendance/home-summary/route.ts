import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireUser } from "@/lib/auth"
import { getWorkingDaysInWeek, isHoliday } from "@/lib/holidays"
import { kstMinutesOfDay, overlapHours, toWindow, type HourlyVacWindow } from "@/lib/workHours"

const KST = 9 * 60 * 60 * 1000
const toMin = (ts: string) => Math.floor(new Date(ts).getTime() / 60000)

function fmtTime(ts: string) {
  const kst = new Date(new Date(ts).getTime() + KST)
  return `${String(kst.getUTCHours()).padStart(2, "0")}:${String(kst.getUTCMinutes()).padStart(2, "0")}`
}

function getKSTDateStr(offsetDays = 0) {
  const d = new Date(Date.now() + KST + offsetDays * 86400000)
  return d.toISOString().slice(0, 10)
}

function getMonday(todayKST: string): string {
  const d = new Date(todayKST + "T00:00:00Z")
  const dow = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - (dow === 0 ? 6 : dow - 1))
  return d.toISOString().slice(0, 10)
}

function getFriday(monday: string): string {
  const d = new Date(monday + "T00:00:00Z")
  d.setUTCDate(d.getUTCDate() + 4)
  return d.toISOString().slice(0, 10)
}

export async function GET(req: Request) {
  const auth = await requireUser(req)
  if (!auth.ok) return auth.response
  const userId = auth.user.id

  const todayStr  = getKSTDateStr()
  const mondayStr = getMonday(todayStr)
  const fridayStr = getFriday(mondayStr)
  // timestamptz 범위 (KST 기준)
  const startOfWeek = new Date(Date.UTC(...(mondayStr.split("-").map(Number) as [number, number, number])) - KST).toISOString()
  const endOfWeek   = new Date(Date.UTC(...(fridayStr.split("-").map(Number) as [number, number, number])) - KST + 86400000).toISOString()

  const [{ data: profileRow }, weekDates] = await Promise.all([
    supabaseAdmin.from("users").select("name, department, position, is_remote, use_session_tracking").eq("id", userId).single(),
    Promise.resolve(Array.from({ length: 5 }, (_, i) => {
      const d = new Date(mondayStr + "T00:00:00Z")
      d.setUTCDate(d.getUTCDate() + i)
      return d.toISOString().slice(0, 10)
    })),
  ])

  const useSessionTracking = profileRow?.use_session_tracking ?? false

  // ── 오늘 출퇴근 ──
  let clockIn: string | null = null
  let clockOut: string | null = null
  let openSessionId: string | null = null
  let todaySessions: { start: string; end: string | null }[] = []

  if (useSessionTracking) {
    const yesterdayStr = getKSTDateStr(-1)
    const { data: sessions } = await supabaseAdmin
      .from("work_sessions")
      .select("id, start_time, end_time, date")
      .eq("user_id", userId)
      .eq("date", todayStr)
      .order("start_time")
    let open = (sessions ?? []).find(s => !s.end_time)
    todaySessions = (sessions ?? []).map(s => ({ start: fmtTime(s.start_time), end: s.end_time ? fmtTime(s.end_time) : null, date: s.date }))

    // 오늘 세션이 아예 없을 때만 어제 오픈 세션 확인 (자정 넘긴 경우)
    if (!open && (sessions ?? []).length === 0) {
      const { data: yesterdaySessions } = await supabaseAdmin
        .from("work_sessions")
        .select("id, start_time, end_time, date")
        .eq("user_id", userId)
        .eq("date", yesterdayStr)
      open = (yesterdaySessions ?? []).find(s => !s.end_time)
      // 어제 세션도 표시 목록에 포함
      if (yesterdaySessions?.length) {
        todaySessions = [
          ...(yesterdaySessions.map(s => ({ start: fmtTime(s.start_time), end: s.end_time ? fmtTime(s.end_time) : null, date: s.date }))),
          ...todaySessions,
        ]
      }
    }

    openSessionId = open?.id ?? null
    if (open) clockIn = fmtTime(open.start_time)
  } else {
    const { data: rec } = await supabaseAdmin
      .from("attendance_records")
      .select("clock_in, clock_out")
      .eq("user_id", userId)
      .eq("date", todayStr)
      .maybeSingle()
    if (rec?.clock_in)  clockIn  = fmtTime(rec.clock_in)
    if (rec?.clock_out) clockOut = fmtTime(rec.clock_out)
  }

  // ── 주간 근무시간 ──
  let weeklyHours = 0

  const [weekAttendance, { data: weekTrips }, { data: weekVacations }] = await Promise.all([
    useSessionTracking
      ? supabaseAdmin.from("work_sessions").select("date, start_time, end_time, lunch_break").eq("user_id", userId).gte("date", mondayStr).lte("date", fridayStr).not("end_time", "is", null).then(r => r.data ?? [])
      : supabaseAdmin.from("attendance_records").select("date, clock_in, clock_out, lunch_break").eq("user_id", userId).gte("date", mondayStr).lte("date", fridayStr).then(r => r.data ?? []),
    supabaseAdmin.from("business_trip_requests").select("start_date, end_date, start_time, end_time, lunch_break").eq("user_id", userId).eq("status", "approved").lte("start_date", fridayStr).gte("end_date", mondayStr),
    supabaseAdmin.from("vacation_requests").select("start_date, hours, start_time, end_time").eq("user_id", userId).eq("status", "approved").not("hours", "is", null).gte("start_date", mondayStr).lte("start_date", fridayStr),
  ])

  // 시간 휴가 창(날짜별) — 근무 구간과 겹치는 만큼 근무시간에서 차감
  const vacWindowsByDate: Record<string, HourlyVacWindow[]> = {}
  for (const v of weekVacations ?? []) {
    const w = toWindow(v.start_time, v.end_time)
    if (w) (vacWindowsByDate[v.start_date] ??= []).push(w)
  }

  if (useSessionTracking) {
    weeklyHours = (weekAttendance as any[]).reduce((sum: number, s: any) => {
      const h = (toMin(s.end_time) - toMin(s.start_time)) / 60
      const worked = s.lunch_break && h >= 1 ? h - 1 : h
      const ded = overlapHours(kstMinutesOfDay(s.start_time), kstMinutesOfDay(s.end_time), vacWindowsByDate[s.date] ?? [])
      return sum + Math.max(0, worked - ded)
    }, 0)
  } else {
    weeklyHours = (weekAttendance as any[]).reduce((sum: number, r: any) => {
      if (!r.clock_in || !r.clock_out) return sum
      const h = (toMin(r.clock_out) - toMin(r.clock_in)) / 60
      const worked = r.lunch_break && h >= 1 ? h - 1 : h
      const ded = overlapHours(kstMinutesOfDay(r.clock_in), kstMinutesOfDay(r.clock_out), vacWindowsByDate[r.date] ?? [])
      return sum + Math.max(0, worked - ded)
    }, 0)
  }

  const monday = new Date(mondayStr + "T00:00:00Z")
  const tripTotal = (weekTrips ?? []).reduce((sum, t) => {
    if (!t.start_time || !t.end_time) return sum
    const isSingleDay = t.start_date === t.end_date
    let dayHours = 0
    for (let i = 0; i < 5; i++) {
      const date = weekDates[i]
      if (date < t.start_date || date > t.end_date) continue
      const startStr = isSingleDay || t.start_date === date ? t.start_time : "09:00"
      const endStr   = isSingleDay || t.end_date === date   ? t.end_time   : "18:00"
      const [sh, sm] = startStr.split(":").map(Number)
      const [eh, em] = endStr.split(":").map(Number)
      dayHours += (eh * 60 + em - sh * 60 - sm) / 60
    }
    const adjusted = t.lunch_break && dayHours >= 1 ? dayHours - 1 : dayHours
    return sum + adjusted
  }, 0)

  const vacTotal = (weekVacations ?? []).reduce((s, v) => s + (v.hours ?? 0), 0)
  weeklyHours += tripTotal + vacTotal

  const mondayDate = monday
  const weeklyGoal = getWorkingDaysInWeek(mondayDate) * 5

  return NextResponse.json({
    profile: {
      name: profileRow?.name ?? "",
      department: profileRow?.department ?? "",
      position: profileRow?.position ?? "",
      is_remote: profileRow?.is_remote ?? false,
      use_session_tracking: useSessionTracking,
    },
    today: { clockIn, clockOut, openSessionId, todaySessions },
    weeklyHours,
    weeklyGoal,
  })
}
