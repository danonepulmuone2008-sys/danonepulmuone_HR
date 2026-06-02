import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireUser } from "@/lib/auth"

export async function GET(req: Request) {
  const auth = await requireUser(req)
  if (!auth.ok) return auth.response
  const userId = auth.user.id

  const direction = new URL(req.url).searchParams.get("direction")

  if (direction === "sent") {
    // 내가 보낸 대기 건
    const { data } = await supabaseAdmin
      .from("meal_transfers")
      .select("id, to_user_id, amount, note, created_at")
      .eq("from_user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    const toIds = [...new Set((data ?? []).map((t) => t.to_user_id))]
    const { data: receivers } = toIds.length > 0
      ? await supabaseAdmin.from("users").select("id, name").in("id", toIds)
      : { data: [] }
    const receiverMap = Object.fromEntries((receivers ?? []).map((u) => [u.id, u.name]))

    return NextResponse.json(
      (data ?? []).map((t) => ({
        id: t.id,
        to_name: receiverMap[t.to_user_id] ?? "알 수 없음",
        amount: t.amount,
        note: t.note,
        created_at: t.created_at,
      }))
    )
  }

  // 기본: 내가 받은 대기 건
  const { data } = await supabaseAdmin
    .from("meal_transfers")
    .select("id, from_user_id, amount, note, created_at")
    .eq("to_user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })

  const fromIds = [...new Set((data ?? []).map((t) => t.from_user_id))]
  const { data: senders } = fromIds.length > 0
    ? await supabaseAdmin.from("users").select("id, name").in("id", fromIds)
    : { data: [] }
  const senderMap = Object.fromEntries((senders ?? []).map((s) => [s.id, s.name]))

  return NextResponse.json(
    (data ?? []).map((t) => ({
      id: t.id,
      from_name: senderMap[t.from_user_id] ?? "알 수 없음",
      amount: t.amount,
      note: t.note,
      created_at: t.created_at,
    }))
  )
}

export async function POST(req: Request) {
  const auth = await requireUser(req)
  if (!auth.ok) return auth.response
  const userId = auth.user.id

  const { toUserId, amount, note } = await req.json()
  if (!toUserId || !amount || amount <= 0 || toUserId === userId)
    return NextResponse.json({ error: "올바른 값을 입력해주세요" }, { status: 400 })

  const { error } = await supabaseAdmin
    .from("meal_transfers")
    .insert({ from_user_id: userId, to_user_id: toUserId, amount, note: note || null })

  if (error) return NextResponse.json({ error: "저장에 실패했습니다" }, { status: 500 })
  return NextResponse.json({ success: true })
}
