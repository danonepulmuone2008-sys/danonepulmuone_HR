import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireUser } from "@/lib/auth"
import { getWorkingDaysInWeek, isHoliday } from "@/lib/holidays"

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
    const { data: sessions } = await supabaseAdmin
      .from("work_sessions")
      .select("id, start_time, end_time")
      .eq("user_id", userId)
      .eq("date", todayStr)
      .order("start_time")
    const open = (sessions ?? []).find(s => !s.end_time)
    todaySessions = (sessions ?? []).map(s => ({ start: fmtTime(s.start_time), end: s.end_time ? fmtTime(s.end_time) : null }))
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
    supabaseAdmin.from("business_trip_requests").select("start_date, end_date, start_time, end_time").eq("user_id", userId).eq("status", "approved").lte("start_date", fridayStr).gte("end_date", mondayStr),
    supabaseAdmin.from("vacation_requests").select("start_date, hours").eq("user_id", userId).eq("status", "approved").not("hours", "is", null).gte("start_date", mondayStr).lte("start_date", fridayStr),
  ])

  if (useSessionTracking) {
    weeklyHours = (weekAttendance as any[]).reduce((sum: number, s: any) => {
      const h = (toMin(s.end_time) - toMin(s.start_time)) / 60
      return sum + (s.lunch_break && h >= 1 ? h - 1 : h)
    }, 0)
  } else {
    weeklyHours = (weekAttendance as any[]).reduce((sum: number, r: any) => {
      if (!r.clock_in || !r.clock_out) return sum
      const h = (toMin(r.clock_out) - toMin(r.clock_in)) / 60
      return sum + (r.lunch_break && h >= 1 ? h - 1 : h)
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
    return sum + dayHours
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
