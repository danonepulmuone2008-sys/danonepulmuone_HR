import { NextResponse } from "next/server"
import { createAuthClient } from "@/lib/supabase"
import { getMealLimit } from "@/lib/holidays"

export async function GET(req: Request) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? ""
    if (!token) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const client = createAuthClient(token)
    const { data: { user } } = await client.auth.getUser()
    if (!user) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const startOfMonth = `${year}-${String(month).padStart(2, "0")}-01`
    const startOfNext = month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`

    const { data, error } = await client
      .from("receipts")
      .select("total_amount")
      .eq("uploader_id", user.id)
      .gte("paid_at", startOfMonth)
      .lt("paid_at", startOfNext)
    if (error) throw new Error(error.message)

    const used = (data ?? []).reduce((sum, r) => sum + (r.total_amount ?? 0), 0)
    const totalLimit = getMealLimit(year, month)

    return NextResponse.json({ used, totalLimit })
  } catch (err) {
    console.error("[meals usage]", err)
    return NextResponse.json({ error: "조회에 실패했습니다" }, { status: 500 })
  }
}
