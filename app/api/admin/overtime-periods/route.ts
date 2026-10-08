import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth"

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response

    const { data, error } = await supabaseAdmin
      .from("overtime_periods")
      .select("*")
      .order("start_date", { ascending: false })

    if (error) throw error

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error("[overtime-periods GET]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response
    if (auth.profile.role !== "admin") {
      return NextResponse.json({ error: "admin 권한이 필요합니다" }, { status: 403 })
    }

    const { name, start_date, end_date, daily_work_hours } = await req.json()

    if (!start_date || !end_date || !daily_work_hours) {
      return NextResponse.json({ error: "필수 값이 누락됐습니다" }, { status: 400 })
    }
    if (start_date > end_date) {
      return NextResponse.json({ error: "시작일이 종료일보다 늦을 수 없습니다" }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from("overtime_periods")
      .insert({ name: name ?? "", start_date, end_date, daily_work_hours })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (err) {
    console.error("[overtime-periods POST]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
