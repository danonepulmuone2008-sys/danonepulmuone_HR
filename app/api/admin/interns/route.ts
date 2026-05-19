import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id, name, email, phone")
      .neq("role", "admin")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);

    const interns = (data ?? []).map((u) => ({
      id: u.id,
      name: u.name ?? "",
      email: u.email ?? "",
      phone: u.phone ?? "",
    }));

    return NextResponse.json({ interns });
  } catch (err) {
    console.error("[admin/interns]", err);
    return NextResponse.json({ error: "조회에 실패했습니다" }, { status: 500 });
  }
}
