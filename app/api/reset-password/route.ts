import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const userId = req.cookies.get("reset_user_id")?.value;

  if (!userId) {
    return NextResponse.json({ error: "인증이 만료되었습니다. 비밀번호 찾기를 다시 시도해주세요" }, { status: 401 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "비밀번호는 6자 이상이어야 합니다" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });

  if (error) {
    return NextResponse.json({ error: "비밀번호 변경에 실패했습니다" }, { status: 500 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete("reset_user_id");
  return response;
}
