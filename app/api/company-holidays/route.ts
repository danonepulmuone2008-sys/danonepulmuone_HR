import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");

    let query = supabaseAdmin
      .from("company_holidays")
      .select("date, description")
      .order("date", { ascending: true });

    if (year) {
      query = query.gte("date", `${year}-01-01`).lte("date", `${year}-12-31`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ holidays: data ?? [] });
  } catch (err) {
    console.error("[company-holidays GET]", err);
    return NextResponse.json({ error: "조회에 실패했습니다" }, { status: 500 });
  }
}
