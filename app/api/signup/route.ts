import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { email, password, name, phone, department, position, securityQuestion, securityAnswer } = await req.json();

    const { data, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, phone, department, position, securityQuestion, securityAnswer },
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const { error: userError } = await supabaseAdmin.from("users").upsert({
      id: data.user.id,
      email,
      name,
      phone,
      department,
      position,
    }, { onConflict: "id" });

    if (userError) {
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[signup]", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
