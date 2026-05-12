import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id, name, email, phone, created_at")
      .neq("role", "admin")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const interns = (data ?? []).map((u) => ({
      ...u,
      phone: u.phone ? u.phone.replace(/\D/g, "") : "",
    }));

    return NextResponse.json({ interns });
  } catch (err) {
    console.error("[admin/users-profile]", err);
    return NextResponse.json({ error: "조회에 실패했습니다" }, { status: 500 });
  }
}
