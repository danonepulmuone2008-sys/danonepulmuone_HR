import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

function calcHours(clockIn: string | null, clockOut: string | null, lunchBreak: boolean | null): number | null {
  if (!clockIn || !clockOut) return null
  const diff = (new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 3600000
  if (diff <= 0) return null
  const adjusted = lunchBreak ? Math.max(0, diff - 1) : diff
  return Math.round(adjusted * 10) / 10
}

function calcTripHours(startTime: string, endTime: string): number | null {
  const [sh, sm] = startTime.split(":").map(Number)
  const [eh, em] = endTime.split(":").map(Number)
  const diff = (eh * 60 + em - sh * 60 - sm) / 60
  if (diff <= 0) return null
  return Math.round(diff * 10) / 10
}

// GET /api/admin/attendance/records?monday=2026-05-04
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const monday = url.searchParams.get("monday")
    if (!monday) return NextResponse.json({ error: "monday 파라미터 필요" }, { status: 400 })

    // 주간 날짜 배열 (월~금)
    const weekDates: string[] = []
    const base = new Date(monday)
    for (let i = 0; i < 5; i++) {
      const d = new Date(base)
      d.setDate(d.getDate() + i)
      weekDates.push(d.toISOString().slice(0, 10))
    }

    const friday = weekDates[4]

    // 관리자 제외 전체 유저 조회
    const { data: users, error: usersError } = await supabaseAdmin
      .from("users")
      .select("id, name, use_session_tracking")
      .eq("role", "employee")
      .eq("is_active", true)
      .order("name", { ascending: true })

    if (usersError) throw new Error(usersError.message)
    if (!users || users.length === 0) return NextResponse.json({ users: [], records: [] })

    const userIds = users.map((u) => u.id)
    const sessionUserIds = users.filter((u) => u.use_session_tracking).map((u) => u.id)
    const normalUserIds  = users.filter((u) => !u.use_session_tracking).map((u) => u.id)

    // 일반 출퇴근 기록 조회
    const { data: attendanceRows, error: attError } = normalUserIds.length > 0
      ? await supabaseAdmin
          .from("attendance_records")
          .select("user_id, date, clock_in, clock_out, lunch_break")
          .in("user_id", normalUserIds)
          .gte("date", monday)
          .lte("date", friday)
      : { data: [], error: null }

    if (attError) throw new Error(attError.message)

    // 세션 트래킹 유저 work_sessions 조회
    const { data: sessionRows } = sessionUserIds.length > 0
      ? await supabaseAdmin
          .from("work_sessions")
          .select("user_id, date, start_time, end_time, lunch_break")
          .in("user_id", sessionUserIds)
          .gte("date", monday)
          .lte("date", friday)
          .not("end_time", "is", null)
      : { data: [] }

    // 세션 트래킹 유저 출근 중(open) 세션 조회
    const { data: openSessionRows } = sessionUserIds.length > 0
      ? await supabaseAdmin
          .from("work_sessions")
          .select("user_id, date")
          .in("user_id", sessionUserIds)
          .gte("date", monday)
          .lte("date", friday)
          .is("end_time", null)
      : { data: [] }

    // 해당 주 승인된 휴가 및 출장 조회
    const [{ data: vacationRows }, { data: tripRows }, { data: vacHourRows }] = await Promise.all([
      supabaseAdmin
        .from("vacation_requests")
        .select("user_id, start_date, end_date")
        .in("user_id", userIds)
        .eq("status", "approved")
        .lte("start_date", friday)
        .gte("end_date", monday),
      supabaseAdmin
        .from("business_trip_requests")
        .select("user_id, start_date, end_date, start_time, end_time")
        .in("user_id", userIds)
        .eq("status", "approved")
        .lte("start_date", friday)
        .gte("end_date", monday),
      supabaseAdmin
        .from("vacation_requests")
        .select("user_id, start_date, hours")
        .in("user_id", userIds)
        .eq("status", "approved")
        .not("hours", "is", null)
        .gte("start_date", monday)
        .lte("start_date", friday),
    ])

    // 휴가/출장 맵: user_id__date → "vacation" | "business_trip"
    const vacMap: Record<string, "vacation" | "business_trip"> = {}
    for (const v of vacationRows ?? []) {
      for (const date of weekDates) {
        if (v.start_date <= date && date <= v.end_date) {
          vacMap[`${v.user_id}__${date}`] = "vacation"
        }
      }
    }
    // 출장 시간 맵: user_id__date → trip hours
    const tripHoursMap: Record<string, number> = {}
    for (const t of tripRows ?? []) {
      const isSingleDay = t.start_date === t.end_date
      for (const date of weekDates) {
        if (t.start_date <= date && date <= t.end_date) {
          vacMap[`${t.user_id}__${date}`] = "business_trip"
          if (t.start_time && t.end_time) {
            const startStr = isSingleDay || t.start_date === date ? t.start_time : "09:00"
            const endStr   = isSingleDay || t.end_date   === date ? t.end_time   : "18:00"
            const h = calcTripHours(startStr, endStr)
            if (h !== null) tripHoursMap[`${t.user_id}__${date}`] = h
          }
        }
      }
    }

    const toMin = (ts: string) => Math.floor(new Date(ts).getTime() / 60000)

    // user_id + date 키로 맵 생성
    const recMap: Record<string, { hours: number | null; checkedIn: boolean; clockIn?: string; clockOut?: string; lunchBreak?: boolean }> = {}

    // 일반 출퇴근 기록
    for (const row of attendanceRows ?? []) {
      const key = `${row.user_id}__${row.date}`
      recMap[key] = {
        hours: calcHours(row.clock_in, row.clock_out, row.lunch_break),
        checkedIn: !!row.clock_in && !row.clock_out,
        clockIn: row.clock_in ?? undefined,
        clockOut: row.clock_out ?? undefined,
        lunchBreak: row.lunch_break ?? undefined,
      }
    }

    // 세션 트래킹 유저 work_sessions 합산
    for (const s of sessionRows ?? []) {
      const key = `${s.user_id}__${s.date}`
      const h = (toMin(s.end_time) - toMin(s.start_time)) / 60
      const adjusted = s.lunch_break && h >= 1 ? h - 1 : h
      const rounded = Math.round(adjusted * 10) / 10
      if (recMap[key]) {
        recMap[key] = { ...recMap[key], hours: Math.round(((recMap[key].hours ?? 0) + rounded) * 10) / 10 }
      } else {
        recMap[key] = { hours: rounded, checkedIn: false }
      }
    }

    // 세션 트래킹 유저 출근 중 표시
    for (const s of openSessionRows ?? []) {
      const key = `${s.user_id}__${s.date}`
      if (recMap[key]) {
        recMap[key] = { ...recMap[key], checkedIn: true }
      } else {
        recMap[key] = { hours: null, checkedIn: true }
      }
    }
    // 출장 시간을 attendance 시간에 합산
    for (const [key, tripH] of Object.entries(tripHoursMap)) {
      if (recMap[key]) {
        recMap[key] = { ...recMap[key], hours: Math.round(((recMap[key].hours ?? 0) + tripH) * 10) / 10 }
      } else {
        recMap[key] = { hours: tripH, checkedIn: false }
      }
    }
    // 시간 휴가를 attendance 시간에 합산
    for (const v of vacHourRows ?? []) {
      const key = `${v.user_id}__${v.start_date}`
      const h = v.hours as number
      if (recMap[key]) {
        recMap[key] = { ...recMap[key], hours: Math.round(((recMap[key].hours ?? 0) + h) * 10) / 10 }
      } else {
        recMap[key] = { hours: h, checkedIn: false }
      }
    }

    return NextResponse.json({
      users: users.map((u) => ({ id: u.id, name: u.name, use_session_tracking: u.use_session_tracking ?? false })),
      weekDates,
      records: recMap,
      vacations: vacMap,
    })
  } catch (err) {
    console.error("[admin attendance records]", err)
    return NextResponse.json({ error: "조회에 실패했습니다" }, { status: 500 })
  }
}
