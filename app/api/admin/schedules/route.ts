import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);

    const [year, mon] = month.split("-").map(Number);
    const startDate = `${month}-01`;
    const nextMonth = mon === 12 ? `${year + 1}-01-01` : `${year}-${String(mon + 1).padStart(2, "0")}-01`;

    const [flexResult, vacResult, tripResult] = await Promise.all([
      supabaseAdmin
        .from("flex_schedules")
        .select("user_id, user_name, date, start_time, end_time")
        .gte("date", startDate)
        .lt("date", nextMonth)
        .order("date"),
      supabaseAdmin
        .from("vacation_requests")
        .select("user_id, user_name, type, start_date, end_date")
        .eq("status", "approved")
        .gte("end_date", startDate)
        .lt("start_date", nextMonth),
      supabaseAdmin
        .from("business_trip_requests")
        .select("user_id, user_name, destination, start_date, end_date")
        .eq("status", "approved")
        .gte("end_date", startDate)
        .lt("start_date", nextMonth),
    ]);

    if (flexResult.error) throw new Error(flexResult.error.message);

    type ApprovedEvent = {
      user_id: string;
      user_name: string;
      date: string;
      type: "vacation" | "business_trip";
      label: string;
      destination?: string;
    };

    function expandRange(s: string, e: string): string[] {
      const dates: string[] = [];
      const [sy, sm, sd] = (s < startDate ? startDate : s).split("-").map(Number);
      const [ey, em, ed] = e.split("-").map(Number);
      const [ny, nm, nd] = nextMonth.split("-").map(Number);
      const cur = new Date(sy, sm - 1, sd);
      const endD = new Date(ey, em - 1, ed);
      const stopD = new Date(ny, nm - 1, nd);
      while (cur <= endD && cur < stopD) {
        const yy = cur.getFullYear();
        const mm = String(cur.getMonth() + 1).padStart(2, "0");
        const dd = String(cur.getDate()).padStart(2, "0");
        dates.push(`${yy}-${mm}-${dd}`);
        cur.setDate(cur.getDate() + 1);
      }
      return dates;
    }

    const approvedEvents: ApprovedEvent[] = [];

    (vacResult.data ?? []).forEach((v) => {
      expandRange(v.start_date, v.end_date).forEach((date) => {
        approvedEvents.push({ user_id: v.user_id, user_name: v.user_name, date, type: "vacation", label: v.type });
      });
    });

    (tripResult.data ?? []).forEach((t) => {
      expandRange(t.start_date, t.end_date).forEach((date) => {
        approvedEvents.push({ user_id: t.user_id, user_name: t.user_name, date, type: "business_trip", label: "출장", destination: t.destination });
      });
    });

    return NextResponse.json({ flexSchedules: flexResult.data ?? [], approvedEvents });
  } catch (err) {
    console.error("[admin/schedules]", err);
    return NextResponse.json({ error: "조회에 실패했습니다" }, { status: 500 });
  }
}
