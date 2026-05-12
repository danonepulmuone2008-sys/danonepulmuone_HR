import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function GET() {
  const today = getTodayStr();
  const { data, error } = await supabaseAdmin
    .from("attendance_records")
    .select("user_id, clock_in, clock_out")
    .eq("date", today);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const statusMap: Record<string, "출근" | "퇴근"> = {};
  for (const row of data ?? []) {
    if (row.clock_in) {
      statusMap[row.user_id] = row.clock_out ? "퇴근" : "출근";
    }
  }

  return NextResponse.json({ statusMap });
}
