import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_EMAIL = "danone.hradmin@pulmuone.com";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw new Error(error.message);

    const interns = (data.users ?? [])
      .filter((u) => u.email !== ADMIN_EMAIL)
      .map((u) => ({
        id: u.id,
        name: (u.user_metadata?.name ?? u.user_metadata?.full_name ?? u.email ?? ""),
        email: u.email ?? "",
        phone: u.user_metadata?.phone ?? u.phone ?? "",
      }));

    return NextResponse.json({ interns });
  } catch (err) {
    console.error("[admin/interns]", err);
    return NextResponse.json({ error: "조회에 실패했습니다" }, { status: 500 });
  }
}
