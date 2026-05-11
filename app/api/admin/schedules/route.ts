import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);

    const [year, mon] = month.split("-").map(Number);
    const startDate = `${month}-01`;
    const nextMonth = mon === 12 ? `${year + 1}-01-01` : `${year}-${String(mon + 1).padStart(2, "0")}-01`;

    const { data, error } = await supabaseAdmin
      .from("flex_schedules")
      .select("user_id, user_name, date, start_time, end_time")
      .gte("date", startDate)
      .lt("date", nextMonth)
      .order("date");

    if (error) throw new Error(error.message);

    return NextResponse.json({ flexSchedules: data ?? [] });
  } catch (err) {
    console.error("[admin/schedules]", err);
    return NextResponse.json({ error: "조회에 실패했습니다" }, { status: 500 });
  }
}
