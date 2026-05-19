import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAdmin } from "@/lib/auth"

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response

    const url = new URL(req.url)
    const userId = url.searchParams.get("userId")
    const date = url.searchParams.get("date")
    if (!userId || !date) return NextResponse.json({ error: "userId, date 필요" }, { status: 400 })

    const { data } = await supabaseAdmin
      .from("attendance_records")
      .select("clock_in, clock_out, lunch_break")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle()

    return NextResponse.json(data ?? {})
  } catch (err) {
    console.error("[admin/attendance/record GET]", err)
    return NextResponse.json({ error: "조회에 실패했습니다" }, { status: 500 })
  }
}
