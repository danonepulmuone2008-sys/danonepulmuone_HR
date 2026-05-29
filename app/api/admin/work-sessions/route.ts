import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAdmin } from "@/lib/auth"

// POST: 세션 추가
export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response
    const { userId, date, startTime, endTime, lunchBreak } = await req.json()
    if (!userId || !date || !startTime || !endTime) {
      return NextResponse.json({ error: "필수 값 누락" }, { status: 400 })
    }
    const startIso = `${date}T${startTime}:00+09:00`
    const endIso   = `${date}T${endTime}:00+09:00`
    const { error } = await supabaseAdmin
      .from("work_sessions")
      .insert({ user_id: userId, date, start_time: startIso, end_time: endIso, lunch_break: lunchBreak ?? false })
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[admin/work-sessions POST]", err)
    return NextResponse.json({ error: "저장에 실패했습니다" }, { status: 500 })
  }
}

// PATCH: 세션 수정
export async function PATCH(req: Request) {
  try {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response
    const { id, date, startTime, endTime, lunchBreak } = await req.json()
    if (!id || !startTime || !endTime) {
      return NextResponse.json({ error: "필수 값 누락" }, { status: 400 })
    }
    const startIso = `${date}T${startTime}:00+09:00`
    const endIso   = `${date}T${endTime}:00+09:00`
    const { error } = await supabaseAdmin
      .from("work_sessions")
      .update({ start_time: startIso, end_time: endIso, lunch_break: lunchBreak ?? false })
      .eq("id", id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[admin/work-sessions PATCH]", err)
    return NextResponse.json({ error: "수정에 실패했습니다" }, { status: 500 })
  }
}

// DELETE: 세션 삭제
export async function DELETE(req: Request) {
  try {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response
    const url = new URL(req.url)
    const id = url.searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 })
    const { error } = await supabaseAdmin
      .from("work_sessions")
      .delete()
      .eq("id", id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[admin/work-sessions DELETE]", err)
    return NextResponse.json({ error: "삭제에 실패했습니다" }, { status: 500 })
  }
}
