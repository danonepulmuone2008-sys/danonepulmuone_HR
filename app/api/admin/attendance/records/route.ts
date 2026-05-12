import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

function calcHours(clockIn: string | null, clockOut: string | null): number | null {
  if (!clockIn || !clockOut) return null
  const diff = (new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 3600000
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
      .select("id, name")
      .neq("role", "admin")
      .order("name", { ascending: true })

    if (usersError) throw new Error(usersError.message)
    if (!users || users.length === 0) return NextResponse.json({ users: [], records: [] })

    const userIds = users.map((u) => u.id)

    // 해당 주 출퇴근 기록 조회
    const { data: attendanceRows, error: attError } = await supabaseAdmin
      .from("attendance_records")
      .select("user_id, date, clock_in, clock_out")
      .in("user_id", userIds)
      .gte("date", monday)
      .lte("date", friday)

    if (attError) throw new Error(attError.message)

    // user_id + date 키로 맵 생성
    const recMap: Record<string, { hours: number | null; checkedIn: boolean }> = {}
    for (const row of attendanceRows ?? []) {
      const key = `${row.user_id}__${row.date}`
      recMap[key] = {
        hours: calcHours(row.clock_in, row.clock_out),
        checkedIn: !!row.clock_in && !row.clock_out,
      }
    }

    return NextResponse.json({
      users: users.map((u) => ({ id: u.id, name: u.name })),
      weekDates,
      records: recMap,
    })
  } catch (err) {
    console.error("[admin attendance records]", err)
    return NextResponse.json({ error: "조회에 실패했습니다" }, { status: 500 })
  }
}
