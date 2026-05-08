import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { email, securityQuestion, securityAnswer } = await req.json();

  if (!email || !securityQuestion || !securityAnswer) {
    return NextResponse.json({ error: "모든 항목을 입력해주세요" }, { status: 400 });
  }


  let users;
  try {
    const result = await supabaseAdmin.auth.admin.listUsers();
    if (result.error) {
      return NextResponse.json({ error: `Admin API 오류: ${result.error.message}` }, { status: 500 });
    }
    users = result.data.users;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `예외 발생: ${msg}` }, { status: 500 });
  }

  const user = users.find((u) => u.email === email);
  if (!user) {
    return NextResponse.json({ error: "등록되지 않은 이메일입니다" }, { status: 404 });
  }

  const meta = user.user_metadata;
  if (meta.securityQuestion !== securityQuestion || meta.securityAnswer !== securityAnswer) {
    return NextResponse.json({ error: "질문 또는 답변이 일치하지 않습니다" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("reset_user_id", user.id, {
    httpOnly: true,
    maxAge: 60 * 10,
    path: "/",
  });
  return response;
}
