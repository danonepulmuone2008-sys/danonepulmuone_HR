import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(req: Request) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? ""
    if (!token) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    const year   = searchParams.get("year")  ?? String(new Date().getFullYear())
    const month  = searchParams.get("month") ?? String(new Date().getMonth() + 1)

    if (!userId) return NextResponse.json({ error: "userId가 필요합니다" }, { status: 400 })

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`
    const endDate   = new Date(Number(year), Number(month), 1).toISOString().slice(0, 10)

    // 해당 유저가 assigned된 receipt_items 조회 (해당 월 범위)
    const { data: items, error: itemsError } = await supabaseAdmin
      .from("receipt_items")
      .select("receipt_id, price")
      .eq("assigned_user_id", userId)

    if (itemsError) throw itemsError

    if (!items || items.length === 0) return NextResponse.json([])

    // receipt_id별 내 price 합산
    const myAmountMap: Record<string, number> = {}
    for (const item of items) {
      myAmountMap[item.receipt_id] = (myAmountMap[item.receipt_id] ?? 0) + (item.price ?? 0)
    }

    const receiptIds = Object.keys(myAmountMap)

    // 해당 월 범위 receipts 조회
    const { data: receipts, error: receiptsError } = await supabaseAdmin
      .from("receipts")
      .select("id, store_name, paid_at, total_amount, status")
      .in("id", receiptIds)
      .gte("paid_at", startDate)
      .lt("paid_at", endDate)
      .order("paid_at", { ascending: false })

    if (receiptsError) throw receiptsError

    const result = (receipts ?? []).map((r) => ({
      ...r,
      my_amount: myAmountMap[r.id] ?? 0,
    }))

    return NextResponse.json(result)
  } catch (err) {
    console.error("[admin/meals/receipts GET]", err)
    return NextResponse.json({ error: "조회에 실패했습니다" }, { status: 500 })
  }
}
