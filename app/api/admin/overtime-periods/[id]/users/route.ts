import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth"

// 기간에 배정된 직원 목록 조회
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response

    const { id } = await params
    const { data, error } = await supabaseAdmin
      .from("overtime_period_users")
      .select("user_id")
      .eq("period_id", id)

    if (error) throw error

    return NextResponse.json((data ?? []).map((r: { user_id: string }) => r.user_id))
  } catch (err) {
    console.error("[overtime-period-users GET]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// 직원 배정 (overlap 검사 포함)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response
    if (auth.profile.role !== "admin") {
      return NextResponse.json({ error: "admin 권한이 필요합니다" }, { status: 403 })
    }

    const { id } = await params
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: "userId 누락" }, { status: 400 })

    // 현재 기간 조회
    const { data: period, error: pErr } = await supabaseAdmin
      .from("overtime_periods")
      .select("start_date, end_date")
      .eq("id", id)
      .single()

    if (pErr || !period) return NextResponse.json({ error: "기간을 찾을 수 없습니다" }, { status: 404 })

    // 날짜가 겹치는 다른 기간 조회
    const { data: overlappingPeriods } = await supabaseAdmin
      .from("overtime_periods")
      .select("id")
      .neq("id", id)
      .lte("start_date", period.end_date)
      .gte("end_date", period.start_date)

    if (overlappingPeriods && overlappingPeriods.length > 0) {
      const overlappingIds = overlappingPeriods.map((p: any) => p.id)

      // 겹치는 기간 중 이 직원이 명시 배정된 기간
      const { data: userAssignments } = await supabaseAdmin
        .from("overtime_period_users")
        .select("period_id")
        .in("period_id", overlappingIds)
        .eq("user_id", userId)

      const assignedPeriodIds = new Set((userAssignments ?? []).map((r: any) => r.period_id))

      // 겹치는 기간 중 명시 배정 자체가 없는 기간 (= 전체 적용 기간)
      const { data: periodsWithAnyUser } = await supabaseAdmin
        .from("overtime_period_users")
        .select("period_id")
        .in("period_id", overlappingIds)

      const periodsWithUsers = new Set((periodsWithAnyUser ?? []).map((r: any) => r.period_id))

      const hasOverlap = overlappingIds.some((pid: string) =>
        assignedPeriodIds.has(pid) || !periodsWithUsers.has(pid)
      )

      if (hasOverlap) {
        return NextResponse.json({ error: "해당 직원은 겹치는 기간에 이미 배정되어 있습니다" }, { status: 409 })
      }
    }

    const { error } = await supabaseAdmin
      .from("overtime_period_users")
      .upsert({ period_id: id, user_id: userId }, { onConflict: "period_id,user_id" })

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[overtime-period-users POST]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// 직원 배정 해제
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response
    if (auth.profile.role !== "admin") {
      return NextResponse.json({ error: "admin 권한이 필요합니다" }, { status: 403 })
    }

    const { id } = await params
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: "userId 누락" }, { status: 400 })

    const { error } = await supabaseAdmin
      .from("overtime_period_users")
      .delete()
      .eq("period_id", id)
      .eq("user_id", userId)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[overtime-period-users DELETE]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
