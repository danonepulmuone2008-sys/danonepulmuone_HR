import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(req: Request) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? ""
    if (!token) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    const year = searchParams.get("year") ?? String(new Date().getFullYear())
    const month = searchParams.get("month") ?? String(new Date().getMonth() + 1)

    if (!userId) return NextResponse.json({ error: "userId가 필요합니다" }, { status: 400 })

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`
    const endDate = new Date(Number(year), Number(month), 1).toISOString().slice(0, 10)

    const { data, error } = await supabaseAdmin
      .from("receipts")
      .select("id, store_name, paid_at, total_amount, status")
      .eq("uploader_id", userId)
      .gte("paid_at", startDate)
      .lt("paid_at", endDate)
      .order("paid_at", { ascending: false })

    if (error) throw error

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error("[admin/meals/receipts GET]", err)
    return NextResponse.json({ error: "조회에 실패했습니다" }, { status: 500 })
  }
}
