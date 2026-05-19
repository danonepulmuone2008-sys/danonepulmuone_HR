import { NextResponse } from "next/server"
import { supabase, supabaseAdmin } from "@/lib/supabase"
import { getMealLimit, getMonthlyBusinessDays } from "@/lib/holidays"

export async function GET(req: Request) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? ""
    if (!token) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const targetMonth = `${year}-${String(month).padStart(2, "0")}-01`

    const { data } = await supabaseAdmin
      .from("monthly_meal_limits")
      .select("monthly_meal_limit, daily_meal_limit, business_days")
      .eq("target_month", targetMonth)
      .maybeSingle()

    if (data) {
      return NextResponse.json({
        monthlyLimit: data.monthly_meal_limit,
        dailyLimit: data.daily_meal_limit,
        businessDays: data.business_days,
      })
    }

    return NextResponse.json({
      monthlyLimit: getMealLimit(year, month),
      dailyLimit: 10000,
      businessDays: getMonthlyBusinessDays(year, month),
    })
  } catch (err) {
    console.error("[meals/limit GET]", err)
    return NextResponse.json({ error: "조회에 실패했습니다" }, { status: 500 })
  }
}
