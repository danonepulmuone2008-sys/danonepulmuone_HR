import { NextResponse } from "next/server"
import { supabase, supabaseAdmin } from "@/lib/supabase"

export async function GET(req: Request) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? ""
    if (!token) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    const year   = searchParams.get("year")  ?? String(new Date().getFullYear())
    const month  = searchParams.get("month") ?? String(new Date().getMonth() + 1)

    if (!userId) {
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`
      const endDate   = new Date(Number(year), Number(month), 1).toISOString().slice(0, 10)

      const { data: receipts, error: receiptsError } = await supabaseAdmin
        .from("receipts")
        .select("id, store_name, paid_at, total_amount, status, uploader_id")
        .gte("paid_at", startDate)
        .lt("paid_at", endDate)
        .order("paid_at", { ascending: false })

      if (receiptsError) throw receiptsError
      if (!receipts || receipts.length === 0) return NextResponse.json([])

      const uploaderIds = [...new Set(receipts.map((r) => r.uploader_id).filter(Boolean))]
      let uploaderMap: Record<string, string> = {}
      if (uploaderIds.length > 0) {
        const { data: uploaders } = await supabaseAdmin
          .from("users").select("id, name").in("id", uploaderIds)
        uploaderMap = Object.fromEntries((uploaders ?? []).map((u) => [u.id, u.name]))
      }

      // 영수증별 업로더 외 담당자 수 계산
      const receiptIds = receipts.map((r) => r.id)
      const extraCountMap: Record<string, number> = {}
      if (receiptIds.length > 0) {
        const { data: itemRows } = await supabaseAdmin
          .from("receipt_items")
          .select("receipt_id, assigned_user_id")
          .in("receipt_id", receiptIds)

        const uploaderByReceipt = Object.fromEntries(receipts.map((r) => [r.id, r.uploader_id]))
        for (const r of receipts) {
          const assignees = new Set(
            (itemRows ?? [])
              .filter((i) => i.receipt_id === r.id)
              .map((i) => i.assigned_user_id)
          )
          assignees.delete(uploaderByReceipt[r.id])
          extraCountMap[r.id] = assignees.size
        }
      }

      return NextResponse.json(receipts.map((r) => ({
        ...r,
        uploader_name: uploaderMap[r.uploader_id] ?? "알 수 없음",
        extra_assignee_count: extraCountMap[r.id] ?? 0,
      })))
    }

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`
    const endDate   = new Date(Number(year), Number(month), 1).toISOString().slice(0, 10)

    // 해당 월의 영수증 먼저 조회
    const { data: receipts, error: receiptsError } = await supabaseAdmin
      .from("receipts")
      .select("id, store_name, paid_at, total_amount, status")
      .gte("paid_at", startDate)
      .lt("paid_at", endDate)
      .order("paid_at", { ascending: false })

    if (receiptsError) throw receiptsError
    if (!receipts || receipts.length === 0) return NextResponse.json([])

    const receiptIds = receipts.map((r) => r.id)

    // 해당 유저가 담당자인 항목만 조회
    const { data: items, error: itemsError } = await supabaseAdmin
      .from("receipt_items")
      .select("id, receipt_id, item_name, unit_price, qty, price, status")
      .eq("assigned_user_id", userId)
      .in("receipt_id", receiptIds)

    if (itemsError) throw itemsError
    if (!items || items.length === 0) return NextResponse.json([])

    const itemsByReceipt: Record<string, typeof items> = {}

    for (const item of items) {
      if (!itemsByReceipt[item.receipt_id]) {
        itemsByReceipt[item.receipt_id] = []
      }
      itemsByReceipt[item.receipt_id].push(item)
    }

    const result = receipts
      .filter((r) => itemsByReceipt[r.id]?.length > 0)
      .map((r) => {
        const myItems = itemsByReceipt[r.id] ?? []
        const myAmount = myItems.reduce((sum, item) => sum + (item.price ?? 0), 0)

        return {
          ...r,
          my_amount: myAmount,
          items: myItems,
        }
      })

    return NextResponse.json(result)
  } catch (err) {
    console.error("[admin/meals/receipts GET]", err)
    return NextResponse.json({ error: "조회에 실패했습니다" }, { status: 500 })
  }
}
