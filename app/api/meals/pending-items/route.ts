import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireUser } from "@/lib/auth"

export async function GET(req: Request) {
  const auth = await requireUser(req)
  if (!auth.ok) return auth.response

  const { data: items } = await supabaseAdmin
    .from("receipt_items")
    .select("id, item_name, price, receipt_id")
    .eq("status", "pending")
    .eq("assigned_user_id", auth.user.id)

  if (!items?.length) return NextResponse.json([])

  const receiptIds = [...new Set(items.map((i) => i.receipt_id))]
  const { data: receiptRows } = await supabaseAdmin
    .from("receipts")
    .select("id, store_name, paid_at, uploader_id")
    .in("id", receiptIds)

  const uploaderIds = [...new Set((receiptRows ?? []).map((r) => r.uploader_id))]
  const { data: uploaderRows } = uploaderIds.length > 0
    ? await supabaseAdmin.from("users").select("id, name").in("id", uploaderIds)
    : { data: [] }

  return NextResponse.json(items.map((item) => {
    const receipt = receiptRows?.find((r) => r.id === item.receipt_id)
    const uploader = uploaderRows?.find((u) => u.id === receipt?.uploader_id)
    return {
      id: item.id,
      item_name: item.item_name,
      price: item.price,
      receipt_id: item.receipt_id,
      store_name: receipt?.store_name ?? "가맹점 미인식",
      paid_at: receipt?.paid_at ?? "",
      uploader_name: uploader?.name ?? "알 수 없음",
    }
  }))
}
