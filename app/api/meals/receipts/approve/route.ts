import { NextResponse } from "next/server"
import { supabase, supabaseAdmin } from "@/lib/supabase"

export async function PATCH(req: Request) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? ""
    if (!token) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const { itemId, action } = await req.json() as { itemId: string; action: "approved" | "rejected" }
    if (!itemId || !["approved", "rejected"].includes(action)) {
      return NextResponse.json({ error: "필수 데이터 누락" }, { status: 400 })
    }

    // Update only items assigned to this user
    const { data: item, error: updateError } = await supabaseAdmin
      .from("receipt_items")
      .update({ status: action, responded_at: new Date().toISOString() })
      .eq("id", itemId)
      .eq("assigned_user_id", user.id)
      .select("receipt_id")
      .single()
    if (updateError) throw new Error(`업데이트 실패: ${updateError.message}`)

    // Check if all items for this receipt have responded
    const { data: pending } = await supabaseAdmin
      .from("receipt_items")
      .select("id")
      .eq("receipt_id", item.receipt_id)
      .eq("status", "pending")

    if (pending && pending.length === 0) {
      const { data: rejected } = await supabaseAdmin
        .from("receipt_items")
        .select("id")
        .eq("receipt_id", item.receipt_id)
        .eq("status", "rejected")

      const newStatus = rejected && rejected.length > 0 ? "rejected" : "approved"
      await supabaseAdmin
        .from("receipts")
        .update({ status: newStatus })
        .eq("id", item.receipt_id)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[receipts approve]", err)
    return NextResponse.json({ error: "처리에 실패했습니다" }, { status: 500 })
  }
}
