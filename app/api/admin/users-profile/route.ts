import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id, name, email, phone")
      .neq("role", "admin")
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);

    return NextResponse.json({ interns: data ?? [] });
  } catch (err) {
    console.error("[admin/users-profile]", err);
    return NextResponse.json({ error: "조회에 실패했습니다" }, { status: 500 });
  }
}
