import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id, name, email, phone, is_active, deactivated_at")
      .eq("role", "employee")
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);

    const interns = (data ?? []).map((u) => ({
      id: u.id,
      name: u.name ?? "",
      email: u.email ?? "",
      phone: u.phone ?? "",
      is_active: u.is_active ?? true,
      deactivated_at: u.deactivated_at ?? null,
    }));

    return NextResponse.json({ interns });
  } catch (err) {
    console.error("[admin/interns]", err);
    return NextResponse.json({ error: "조회에 실패했습니다" }, { status: 500 });
  }
}
