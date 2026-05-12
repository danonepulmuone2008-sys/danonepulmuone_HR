import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { user_id, date, clock_in, clock_out, lunch_break } = await req.json();

  const { error } = await supabaseAdmin
    .from("attendance_records")
    .upsert(
      { user_id, date, clock_in, clock_out, lunch_break },
      { onConflict: "user_id,date" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
