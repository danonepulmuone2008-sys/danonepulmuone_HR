import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id, name, email, phone, department, position, role, is_active, created_at")
      .eq("role", "employee")
      .order("is_active", { ascending: false })
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);

    const users = (data ?? []).map((u) => ({
      ...u,
      phone: u.phone ? u.phone.replace(/\D/g, "") : "",
    }));

    return NextResponse.json({ interns: users });
  } catch (err) {
    console.error("[admin/users-profile]", err);
    return NextResponse.json({ error: "조회에 실패했습니다" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const { id, name, department, position, phone, email, role, is_active } = await req.json();
    if (!id) return NextResponse.json({ error: "id가 필요합니다" }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("users")
      .update({ name, department, position, phone, email, role, is_active, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/users-profile PATCH]", err);
    return NextResponse.json({ error: "수정에 실패했습니다" }, { status: 500 });
  }
}
