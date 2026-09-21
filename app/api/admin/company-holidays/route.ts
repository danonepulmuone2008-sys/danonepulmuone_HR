import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth";
import { calcBusinessDaysForPolicy } from "@/lib/holidays";
import { fetchCompanyHolidaySet } from "@/lib/companyHolidays.server";

async function refreshMealLimit(date: string) {
  const [year, month] = date.split("-").map(Number);
  const targetMonth = `${year}-${String(month).padStart(2, "0")}-01`;

  const { data: existing } = await supabaseAdmin
    .from("monthly_meal_limits")
    .select("daily_meal_limit")
    .eq("target_month", targetMonth)
    .maybeSingle();

  if (!existing) return; // 캐시 없으면 스킵 (다음 GET 시 자동 계산)

  const dailyLimit = existing.daily_meal_limit;
  const companyHolidays = await fetchCompanyHolidaySet();
  const { businessDays, holidayCount } = calcBusinessDaysForPolicy(year, month, {}, companyHolidays);
  const monthlyLimit = dailyLimit * businessDays;

  await supabaseAdmin
    .from("monthly_meal_limits")
    .update({
      business_days: businessDays,
      holiday_count: holidayCount,
      monthly_meal_limit: monthlyLimit,
      updated_at: new Date().toISOString(),
    })
    .eq("target_month", targetMonth);
}

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");

    let query = supabaseAdmin
      .from("company_holidays")
      .select("id, date, description, created_at")
      .order("date", { ascending: true });

    if (year) {
      query = query.gte("date", `${year}-01-01`).lte("date", `${year}-12-31`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ holidays: data ?? [] });
  } catch (err) {
    console.error("[admin/company-holidays GET]", err);
    return NextResponse.json({ error: "조회에 실패했습니다" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const { date, description } = await req.json();
    if (!date) return NextResponse.json({ error: "날짜가 필요합니다" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("company_holidays")
      .insert({ date, description: description ?? null })
      .select("id, date, description, created_at")
      .single();

    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "이미 등록된 날짜입니다" }, { status: 409 });
      throw error;
    }

    await refreshMealLimit(date).catch(() => {});

    return NextResponse.json({ holiday: data });
  } catch (err) {
    console.error("[admin/company-holidays POST]", err);
    return NextResponse.json({ error: "등록에 실패했습니다" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    if (!date) return NextResponse.json({ error: "날짜가 필요합니다" }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("company_holidays")
      .delete()
      .eq("date", date);

    if (error) throw error;

    await refreshMealLimit(date).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/company-holidays DELETE]", err);
    return NextResponse.json({ error: "삭제에 실패했습니다" }, { status: 500 });
  }
}
