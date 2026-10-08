import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response
    if (auth.profile.role !== "admin") {
      return NextResponse.json({ error: "admin 권한이 필요합니다" }, { status: 403 })
    }

    const { id } = await params
    const { name, start_date, end_date, daily_work_hours } = await req.json()

    if (start_date && end_date && start_date > end_date) {
      return NextResponse.json({ error: "시작일이 종료일보다 늦을 수 없습니다" }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (start_date !== undefined) updates.start_date = start_date
    if (end_date !== undefined) updates.end_date = end_date
    if (daily_work_hours !== undefined) updates.daily_work_hours = daily_work_hours

    const { data, error } = await supabaseAdmin
      .from("overtime_periods")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (err) {
    console.error("[overtime-periods PATCH]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response
    if (auth.profile.role !== "admin") {
      return NextResponse.json({ error: "admin 권한이 필요합니다" }, { status: 403 })
    }

    const { id } = await params

    const { error } = await supabaseAdmin
      .from("overtime_periods")
      .delete()
      .eq("id", id)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[overtime-periods DELETE]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
