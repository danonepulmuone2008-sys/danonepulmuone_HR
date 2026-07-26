import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase-server"

export async function PATCH(req: Request) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? ""
    if (!token) return NextResponse.json({ error: "?몄쬆???꾩슂?⑸땲?? }, { status: 401 })

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: "?몄쬆???꾩슂?⑸땲?? }, { status: 401 })

    const { itemId, action } = await req.json() as { itemId: string; action: "approved" | "rejected" }
    if (!itemId || !["approved", "rejected"].includes(action)) {
      return NextResponse.json({ error: "?꾩닔 ?곗씠???꾨씫" }, { status: 400 })
    }

    // Update only items assigned to this user
    const { data: item, error: updateError } = await supabaseAdmin
      .from("receipt_items")
      .update({ status: action, responded_at: new Date().toISOString() })
      .eq("id", itemId)
      .eq("assigned_user_id", user.id)
      .select("receipt_id")
      .single()
    if (updateError) throw new Error(`?낅뜲?댄듃 ?ㅽ뙣: ${updateError.message}`)

    // Check if all items for this receipt have responded
    const { data: pending } = await supabaseAdmin
      .from("receipt_items")
      .select("id")
      .eq("receipt_id", item.receipt_id)
      .eq("status", "pending")

    let receiptFullyApproved = false;
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
      receiptFullyApproved = newStatus === "approved"
    }

    return NextResponse.json({ ok: true, receiptFullyApproved })
  } catch (err) {
    console.error("[receipts approve]", err)
    return NextResponse.json({ error: "泥섎━???ㅽ뙣?덉뒿?덈떎" }, { status: 500 })
  }
}
