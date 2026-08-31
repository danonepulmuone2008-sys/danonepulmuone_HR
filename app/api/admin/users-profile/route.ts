import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    let query = supabaseAdmin
      .from("users")
      .select("id, name, email, phone, department, position, role, is_active, created_at, is_remote, use_session_tracking")
      .order("is_active", { ascending: false })
      .order("name", { ascending: true });

    if (auth.profile.role === "admin") {
      query = query.neq("role", "admin");
    } else {
      query = query.eq("role", "employee");
    }

    const { data, error } = await query;

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

    const { id, name, department, position, phone, email, role, is_active, is_remote, use_session_tracking } = await req.json();
    if (!id) return NextResponse.json({ error: "id가 필요합니다" }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("users")
      .update({ name, department, position, phone, email, role, is_active, is_remote, use_session_tracking, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/users-profile PATCH]", err);
    return NextResponse.json({ error: "수정에 실패했습니다" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    if (auth.profile.role !== "admin") {
      return NextResponse.json({ error: "시스템 관리자만 계정을 삭제할 수 있습니다" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id가 필요합니다" }, { status: 400 });

    if (id === auth.user.id) {
      return NextResponse.json({ error: "자신의 계정은 삭제할 수 없습니다" }, { status: 400 });
    }

    // receipt_items는 receipts보다 먼저 삭제 (FK 제약)
    await supabaseAdmin.from("receipt_items").delete().eq("assigned_user_id", id);

    // 이 유저가 올린 영수증의 항목도 삭제
    const { data: uploaderReceipts } = await supabaseAdmin
      .from("receipts")
      .select("id")
      .eq("uploader_id", id);
    if (uploaderReceipts && uploaderReceipts.length > 0) {
      await supabaseAdmin
        .from("receipt_items")
        .delete()
        .in("receipt_id", uploaderReceipts.map((r: { id: string }) => r.id));
    }

    // vacation_grants.granted_by는 다른 직원 기록이므로 삭제 대신 NULL 처리
    await supabaseAdmin.from("vacation_grants").update({ granted_by: null }).eq("granted_by", id);

    // 나머지 user 관련 테이블 일괄 삭제
    await Promise.all([
      supabaseAdmin.from("receipts").delete().eq("uploader_id", id),
      supabaseAdmin.from("meal_transfers").delete().eq("from_user_id", id),
      supabaseAdmin.from("meal_transfers").delete().eq("to_user_id", id),
      supabaseAdmin.from("attendance_records").delete().eq("user_id", id),
      supabaseAdmin.from("work_sessions").delete().eq("user_id", id),
      supabaseAdmin.from("vacation_requests").delete().eq("user_id", id),
      supabaseAdmin.from("vacation_grants").delete().eq("user_id", id),
      supabaseAdmin.from("business_trip_requests").delete().eq("user_id", id),
      supabaseAdmin.from("attendance_edit_requests").delete().eq("user_id", id),
      supabaseAdmin.from("flex_schedules").delete().eq("user_id", id),
    ]);

    // public.users 삭제
    await supabaseAdmin.from("users").delete().eq("id", id);

    // storage.objects.owner → auth.users(id) FK 제약 해소를 위해 스토리지 파일 삭제
    const { data: storageFiles } = await supabaseAdmin.storage
      .from("receipts")
      .list(id);
    if (storageFiles && storageFiles.length > 0) {
      const paths = storageFiles.map((f: { name: string }) => `${id}/${f.name}`);
      await supabaseAdmin.storage.from("receipts").remove(paths);
    }

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authError) throw authError;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/users-profile DELETE]", err);
    return NextResponse.json({ error: "삭제에 실패했습니다" }, { status: 500 });
  }
}
