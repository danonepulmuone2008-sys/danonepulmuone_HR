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

    const { totalAmount } = await req.json()
    if (typeof totalAmount !== "number" || totalAmount < 0) {
      return NextResponse.json({ error: "올바른 금액을 입력해주세요" }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from("receipts")
      .update({ total_amount: totalAmount })
      .eq("id", params.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[admin/meals/receipts PATCH]", err)
    return NextResponse.json({ error: "수정에 실패했습니다" }, { status: 500 })
  }
}
