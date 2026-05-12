import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? ""
    if (!token) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const { userId, totalAmount } = await req.json()
    if (!userId || typeof totalAmount !== "number" || totalAmount < 0) {
      return NextResponse.json({ error: "올바른 값을 입력해주세요" }, { status: 400 })
    }

    // 해당 영수증에서 이 유저에게 배정된 항목 조회
    const { data: items, error: fetchError } = await supabaseAdmin
      .from("receipt_items")
      .select("id, price")
      .eq("receipt_id", params.id)
      .eq("assigned_user_id", userId)

    if (fetchError) throw fetchError
    if (!items || items.length === 0) {
      return NextResponse.json({ error: "해당 항목이 없습니다" }, { status: 404 })
    }

    if (items.length === 1) {
      // 항목이 1개면 직접 업데이트
      const { error } = await supabaseAdmin
        .from("receipt_items")
        .update({ price: totalAmount })
        .eq("id", items[0].id)
      if (error) throw error
    } else {
      // 항목이 여러 개면 현재 비율 유지하며 분배
      const currentTotal = items.reduce((s, i) => s + (i.price ?? 0), 0)
      for (const item of items) {
        const ratio    = currentTotal > 0 ? (item.price ?? 0) / currentTotal : 1 / items.length
        const newPrice = Math.round(totalAmount * ratio)
        const { error } = await supabaseAdmin
          .from("receipt_items")
          .update({ price: newPrice })
          .eq("id", item.id)
        if (error) throw error
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[admin/meals/receipts PATCH]", err)
    return NextResponse.json({ error: "수정에 실패했습니다" }, { status: 500 })
  }
}
