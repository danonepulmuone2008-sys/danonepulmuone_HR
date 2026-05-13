import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAdmin } from "@/lib/auth"
import { calcBusinessDaysForPolicy } from "@/lib/holidays"

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response
    
    const { searchParams } = new URL(req.url)
    const year  = Number(searchParams.get("year")  ?? new Date().getFullYear())
    const month = Number(searchParams.get("month") ?? new Date().getMonth() + 1)

    const targetMonth = `${year}-${String(month).padStart(2, "0")}-01`

    const { data } = await supabaseAdmin
      .from("monthly_meal_limits")
      .select("*")
      .eq("target_month", targetMonth)
      .maybeSingle()

    if (data) {
      return NextResponse.json({
        source: "db",
        monthlyLimit: data.monthly_meal_limit,
        dailyLimit:   data.daily_meal_limit,
        businessDays: data.business_days,
        holidayCount: data.holiday_count,
      })
    }

    // DB 미등록 → holidays.ts 계산 후 자동 저장
    const dailyLimit = 10000
    const { businessDays, holidayCount } = calcBusinessDaysForPolicy(year, month)
    const monthlyLimit = dailyLimit * businessDays

    await supabaseAdmin.from("monthly_meal_limits").upsert(
      {
        target_month:       targetMonth,
        daily_meal_limit:   dailyLimit,
        business_days:      businessDays,
        holiday_count:      holidayCount,
        monthly_meal_limit: monthlyLimit,
        updated_at:         new Date().toISOString(),
      },
      { onConflict: "target_month", ignoreDuplicates: true }
    )

    return NextResponse.json({
      source: "calculated",
      monthlyLimit,
      dailyLimit,
      businessDays,
      holidayCount,
    })
  } catch (err) {
    console.error("[admin/meals/limit GET]", err)
    return NextResponse.json({ error: "조회에 실패했습니다" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response

    const { year, month, dailyLimit, businessDays, holidayCount } = await req.json()

    if (!year || !month || !dailyLimit || !businessDays) {
      return NextResponse.json({ error: "필수 값이 누락됐습니다" }, { status: 400 })
    }

    const targetMonth    = `${year}-${String(month).padStart(2, "0")}-01`
    const monthlyLimit   = dailyLimit * businessDays

    const { error } = await supabaseAdmin
      .from("monthly_meal_limits")
      .upsert(
        {
          target_month:       targetMonth,
          daily_meal_limit:   dailyLimit,
          business_days:      businessDays,
          holiday_count:      holidayCount ?? 0,
          monthly_meal_limit: monthlyLimit,
          updated_at:         new Date().toISOString(),
        },
        { onConflict: "target_month" }
      )

    if (error) throw error

    return NextResponse.json({ monthlyLimit, dailyLimit, businessDays })
  } catch (err) {
    console.error("[admin/meals/limit PATCH]", err)
    return NextResponse.json({ error: "저장에 실패했습니다" }, { status: 500 })
  }
}
