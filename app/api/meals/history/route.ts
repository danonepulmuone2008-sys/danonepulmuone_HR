import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireUser } from "@/lib/auth"
import { getMealLimit } from "@/lib/holidays"

const KST = 9 * 60 * 60 * 1000

export async function GET(req: Request) {
  const auth = await requireUser(req)
  if (!auth.ok) return auth.response

  const userId = auth.user.id
  const url = new URL(req.url)
  const year  = parseInt(url.searchParams.get("year")  ?? String(new Date().getFullYear()))
  const month = parseInt(url.searchParams.get("month") ?? String(new Date().getMonth() + 1))

  const targetMonth  = `${year}-${String(month).padStart(2, "0")}-01`
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1) - KST).toISOString()
  const startOfNext  = new Date(Date.UTC(year, month, 1)     - KST).toISOString()

  const [
    { data: limitRow },
    { data: approvedReceipts },
    { data: transfersOut },
    { data: transfersIn },
  ] = await Promise.all([
    supabaseAdmin.from("monthly_meal_limits").select("monthly_meal_limit").eq("target_month", targetMonth).maybeSingle(),
    supabaseAdmin.from("receipts").select("id, store_name, paid_at").eq("status", "approved").gte("paid_at", startOfMonth).lt("paid_at", startOfNext),
    supabaseAdmin.from("meal_transfers").select("amount, note, responded_at, to_user_id").eq("from_user_id", userId).eq("status", "approved").gte("responded_at", startOfMonth).lt("responded_at", startOfNext),
    supabaseAdmin.from("meal_transfers").select("amount, note, responded_at, from_user_id").eq("to_user_id", userId).eq("status", "approved").gte("responded_at", startOfMonth).lt("responded_at", startOfNext),
  ])

  const monthlyLimit = limitRow?.monthly_meal_limit ?? getMealLimit(year, month)
  const receiptIds   = (approvedReceipts ?? []).map((r) => r.id)
  const receiptMap   = Object.fromEntries((approvedReceipts ?? []).map((r) => [r.id, r]))

  const { data: myItems } = receiptIds.length > 0
    ? await supabaseAdmin.from("receipt_items").select("price, receipt_id, responded_at").eq("assigned_user_id", userId).eq("status", "approved").in("receipt_id", receiptIds)
    : { data: [] }

  // 양도 상대방 이름 조회
  const transferUserIds = [
    ...new Set([
      ...(transfersOut ?? []).map((t) => t.to_user_id),
      ...(transfersIn ?? []).map((t) => t.from_user_id),
    ]),
  ]
  const { data: transferUsers } = transferUserIds.length > 0
    ? await supabaseAdmin.from("users").select("id, name").in("id", transferUserIds)
    : { data: [] }
  const userMap = Object.fromEntries((transferUsers ?? []).map((u) => [u.id, u.name]))

  type Entry = { date: string; label: string; amount: number; kind: "grant" | "usage" | "transfer_in" | "transfer_out" }

  const entries: Entry[] = [
    { date: targetMonth, label: `${month}월 식대 지급`, amount: monthlyLimit, kind: "grant" },
    ...(myItems ?? []).map((item) => ({
      date: item.responded_at ?? receiptMap[item.receipt_id]?.paid_at ?? targetMonth,
      label: receiptMap[item.receipt_id]?.store_name ?? "가맹점 미인식",
      amount: item.price,
      kind: "usage" as const,
    })),
    ...(transfersOut ?? []).map((t) => ({
      date: t.responded_at ?? targetMonth,
      label: `${userMap[t.to_user_id] ?? "알 수 없음"}에게 양도`,
      amount: t.amount,
      kind: "transfer_out" as const,
    })),
    ...(transfersIn ?? []).map((t) => ({
      date: t.responded_at ?? targetMonth,
      label: `${userMap[t.from_user_id] ?? "알 수 없음"}로부터 양도 수신`,
      amount: t.amount,
      kind: "transfer_in" as const,
    })),
  ]

  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const totalUsed     = (myItems ?? []).reduce((sum, i) => sum + (i.price ?? 0), 0)
  const totalOut      = (transfersOut ?? []).reduce((sum, t) => sum + t.amount, 0)
  const totalIn       = (transfersIn ?? []).reduce((sum, t) => sum + t.amount, 0)
  const remaining     = monthlyLimit - totalUsed - totalOut + totalIn

  return NextResponse.json({ entries, monthlyLimit, totalUsed, remaining })
}
