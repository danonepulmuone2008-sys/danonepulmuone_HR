import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAdmin } from "@/lib/auth"

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response

    const url = new URL(req.url)
    const userId = url.searchParams.get("userId")
    const year = url.searchParams.get("year")
    if (!userId || !year) return NextResponse.json({ error: "userId, year 필요" }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from("vacation_grants")
      .select("id, hours, note, created_at")
      .eq("user_id", userId)
      .eq("year", Number(year))
      .order("created_at", { ascending: false })

    if (error) throw error

    const totalHours = (data ?? []).reduce((sum, g) => sum + (g.hours ?? 0), 0)
    return NextResponse.json({ grants: data ?? [], totalHours })
  } catch (err) {
    console.error("[admin/vacation-grants GET]", err)
    return NextResponse.json({ error: "조회에 실패했습니다" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response

    const { userId, year, hours, note } = await req.json()
    if (!userId || !year || !hours || hours <= 0) {
      return NextResponse.json({ error: "올바른 값을 입력해주세요" }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from("vacation_grants")
      .insert({ user_id: userId, year, hours, note: note || null, granted_by: auth.user.id })

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[admin/vacation-grants POST]", err)
    return NextResponse.json({ error: "지급에 실패했습니다" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response

    const url = new URL(req.url)
    const id = url.searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 })

    const { error } = await supabaseAdmin
      .from("vacation_grants")
      .delete()
      .eq("id", id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[admin/vacation-grants DELETE]", err)
    return NextResponse.json({ error: "삭제에 실패했습니다" }, { status: 500 })
  }
}
