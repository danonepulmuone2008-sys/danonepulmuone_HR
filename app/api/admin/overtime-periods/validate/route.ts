import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth"

// 기간 생성/편집 전 유저 배정 겹침 사전 검증
// Body: { userIds, startDate, endDate, excludePeriodId? }
// Returns: { conflicts: [{ userId, userName }] }
export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response

    const { userIds, startDate, endDate, excludePeriodId } = await req.json()
    if (!userIds?.length || !startDate || !endDate) {
      return NextResponse.json({ conflicts: [] })
    }

    // 날짜가 겹치는 기간 조회 (현재 편집 중인 기간 제외)
    let periodsQuery = supabaseAdmin
      .from("overtime_periods")
      .select("id, name, start_date, end_date")
      .lte("start_date", endDate)
      .gte("end_date", startDate)

    if (excludePeriodId) {
      periodsQuery = periodsQuery.neq("id", excludePeriodId)
    }

    const { data: overlappingPeriods } = await periodsQuery

    if (!overlappingPeriods || overlappingPeriods.length === 0) {
      return NextResponse.json({ conflicts: [] })
    }

    const overlappingIds = overlappingPeriods.map((p: any) => p.id)

    // 겹치는 기간들 중 명시 배정이 있는 기간과 없는(전체 적용) 기간 구분
    const { data: allAssignments } = await supabaseAdmin
      .from("overtime_period_users")
      .select("period_id, user_id")
      .in("period_id", overlappingIds)

    const periodsWithUsers = new Set((allAssignments ?? []).map((r: any) => r.period_id))

    const conflicts: { userId: string }[] = []

    for (const userId of userIds) {
      const hasConflict = overlappingIds.some((pid: string) => {
        if (!periodsWithUsers.has(pid)) return true // 전체 적용 기간 → 무조건 겹침
        return (allAssignments ?? []).some((r: any) => r.period_id === pid && r.user_id === userId)
      })
      if (hasConflict) conflicts.push({ userId })
    }

    // 이름 조회
    const conflictUserIds = conflicts.map(c => c.userId)
    if (conflictUserIds.length === 0) return NextResponse.json({ conflicts: [] })

    const { data: users } = await supabaseAdmin
      .from("users")
      .select("id, name")
      .in("id", conflictUserIds)

    const nameMap = Object.fromEntries((users ?? []).map((u: any) => [u.id, u.name]))
    const result = conflicts.map(c => ({ userId: c.userId, userName: nameMap[c.userId] ?? "알 수 없음" }))

    return NextResponse.json({ conflicts: result })
  } catch (err) {
    console.error("[overtime-periods validate]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
