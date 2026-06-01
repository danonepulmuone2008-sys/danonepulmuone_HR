import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireUser } from "@/lib/auth"

export async function PATCH(req: Request) {
  const auth = await requireUser(req)
  if (!auth.ok) return auth.response
  const userId = auth.user.id

  const { id, action } = await req.json()
  if (!id || !["approved", "rejected"].includes(action))
    return NextResponse.json({ error: "올바른 값을 입력해주세요" }, { status: 400 })

  const { data: transfer } = await supabaseAdmin
    .from("meal_transfers")
    .select("to_user_id, status")
    .eq("id", id)
    .single()

  if (!transfer || transfer.to_user_id !== userId)
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
  if (transfer.status !== "pending")
    return NextResponse.json({ error: "이미 처리된 요청입니다" }, { status: 400 })

  await supabaseAdmin
    .from("meal_transfers")
    .update({ status: action, responded_at: new Date().toISOString() })
    .eq("id", id)

  return NextResponse.json({ success: true })
}
