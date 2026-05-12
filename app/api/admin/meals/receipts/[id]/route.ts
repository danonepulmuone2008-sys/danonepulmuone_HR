import { NextResponse } from "next/server"
import { supabase, supabaseAdmin } from "@/lib/supabase"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? ""
    if (!token) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const { data: receipt, error: receiptError } = await supabaseAdmin
      .from("receipts")
      .select("id, store_name, paid_at, total_amount, status, uploader_id, image_path")
      .eq("id", id)
      .single()

    if (receiptError) throw receiptError
    if (!receipt) return NextResponse.json({ error: "영수증을 찾을 수 없습니다" }, { status: 404 })

    const { data: items, error: itemsError } = await supabaseAdmin
      .from("receipt_items")
      .select("id, item_name, unit_price, qty, price, assigned_user_id, status")
      .eq("receipt_id", id)

    if (itemsError) throw itemsError

    const allUserIds = [
      receipt.uploader_id,
      ...((items ?? []).map((i) => i.assigned_user_id).filter(Boolean)),
    ]
    const uniqueIds = [...new Set(allUserIds)]
    let userMap: Record<string, string> = {}
    if (uniqueIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from("users").select("id, name").in("id", uniqueIds)
      userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u.name]))
    }

    let image_url: string | null = null
    if (receipt.image_path) {
      const { data: signed } = await supabaseAdmin.storage
        .from("receipts")
        .createSignedUrl(receipt.image_path, 3600)
      image_url = signed?.signedUrl ?? null
    }

    return NextResponse.json({
      ...receipt,
      image_url,
      uploader_name: userMap[receipt.uploader_id] ?? "알 수 없음",
      items: (items ?? []).map((i) => ({
        ...i,
        assignee_name: userMap[i.assigned_user_id] ?? "알 수 없음",
      })),
    })
  } catch (err) {
    console.error("[admin/meals/receipts/[id] GET]", err)
    return NextResponse.json({ error: "조회에 실패했습니다" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? ""
    if (!token) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    // 이미지 경로 조회 후 storage 삭제
    const { data: receipt } = await supabaseAdmin
      .from("receipts")
      .select("image_path")
      .eq("id", id)
      .single()

    if (receipt?.image_path) {
      await supabaseAdmin.storage.from("receipts").remove([receipt.image_path])
    }

    // receipt_items 먼저 삭제 (FK 제약)
    const { error: itemsError } = await supabaseAdmin
      .from("receipt_items")
      .delete()
      .eq("receipt_id", id)
    if (itemsError) throw itemsError

    const { error: receiptError } = await supabaseAdmin
      .from("receipts")
      .delete()
      .eq("id", id)
    if (receiptError) throw receiptError

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[admin/meals/receipts/[id] DELETE]", err)
    return NextResponse.json({ error: "삭제에 실패했습니다" }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? ""
    if (!token) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

const body = await req.json()
const { userId, totalAmount, itemId, price, itemStatus } = body

if (itemId && itemStatus !== undefined) {
  const allowed = ["approved", "rejected", "pending"]
  if (!allowed.includes(itemStatus)) {
    return NextResponse.json({ error: "올바른 상태값이 아닙니다" }, { status: 400 })
  }
  const { error } = await supabaseAdmin
    .from("receipt_items")
    .update({ status: itemStatus })
    .eq("id", itemId)
    .eq("receipt_id", id)
  if (error) throw error
  return NextResponse.json({ success: true })
}

if (itemId) {
  if (typeof price !== "number" || price < 0) {
    return NextResponse.json({ error: "올바른 금액을 입력해주세요" }, { status: 400 })
  }

  // qty를 기준으로 unit_price도 같이 보정
  const { data: item, error: itemFetchError } = await supabaseAdmin
    .from("receipt_items")
    .select("id, qty")
    .eq("id", itemId)
    .eq("receipt_id", id)
    .single()

  if (itemFetchError) throw itemFetchError
  if (!item) {
    return NextResponse.json({ error: "해당 항목이 없습니다" }, { status: 404 })
  }

  const qty = item.qty && item.qty > 0 ? item.qty : 1
  const unitPrice = Math.round(price / qty)

  const { error } = await supabaseAdmin
    .from("receipt_items")
    .update({
      price,
      unit_price: unitPrice,
    })
    .eq("id", itemId)
    .eq("receipt_id", id)

  if (error) throw error

  // 영수증 total_amount 재계산
  const { data: allItems } = await supabaseAdmin
    .from("receipt_items")
    .select("price")
    .eq("receipt_id", id)

  const newTotalAmount = (allItems ?? []).reduce((sum, i) => sum + (i.price ?? 0), 0)

  await supabaseAdmin
    .from("receipts")
    .update({ total_amount: newTotalAmount })
    .eq("id", id)

  return NextResponse.json({
    success: true,
    price,
    unit_price: unitPrice,
    new_total_amount: newTotalAmount,
  })
}

if (!userId || typeof totalAmount !== "number" || totalAmount < 0) {
  return NextResponse.json({ error: "올바른 값을 입력해주세요" }, { status: 400 })
}

    // 해당 영수증에서 이 유저에게 배정된 항목 조회
    const { data: items, error: fetchError } = await supabaseAdmin
      .from("receipt_items")
      .select("id, price")
      .eq("receipt_id", id)
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
