import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { sendPushToUsers } from "@/lib/push"

function decodeJwtSub(token: string): string | null {
  try {
    const parts = token.split(".")
    if (parts.length < 2) return null
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, "=")
    const decoded = JSON.parse(Buffer.from(padded, "base64").toString("utf-8"))
    return decoded.sub ?? null
  } catch {
    return null
  }
}

export async function PATCH(req: Request) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? ""
    if (!token) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const userId = decodeJwtSub(token)
    if (!userId) return NextResponse.json({ error: "JWT 디코딩 실패" }, { status: 401 })

    const { type, id, action } = await req.json() as {
      type: "business_trip" | "vacation" | "attendance_edit"
      id: string
      action: "approved" | "rejected"
    }

    if (!type || !id || !["approved", "rejected"].includes(action)) {
      return NextResponse.json({ error: "필수 데이터 누락" }, { status: 400 })
    }

    const actionLabel = action === "approved" ? "승인" : "반려"

    const { data: manager } = await supabaseAdmin.from("users").select("name").eq("id", userId).single()
    const managerName = manager?.name ?? "담당자"

    if (type === "business_trip") {
      const { data: req } = await supabaseAdmin
        .from("business_trip_requests")
        .select("user_id")
        .eq("id", id)
        .single()
      const { error } = await supabaseAdmin
        .from("business_trip_requests")
        .update({ status: action, reviewed_by: userId })
        .eq("id", id)
      if (error) throw new Error(error.message)
      if (req) sendPushToUsers([req.user_id], {
        title: `✈️ 출장 신청 ${actionLabel}`,
        body: `${managerName}님이 출장 신청을 ${actionLabel}했습니다.`,
        url: `/attendance/business-trip/${id}`,
      }).catch(() => {})
    } else if (type === "vacation") {
      const { data: req } = await supabaseAdmin
        .from("vacation_requests")
        .select("user_id")
        .eq("id", id)
        .single()
      const { error } = await supabaseAdmin
        .from("vacation_requests")
        .update({ status: action, reviewed_by: userId })
        .eq("id", id)
      if (error) throw new Error(error.message)
      if (req) sendPushToUsers([req.user_id], {
        title: `🌴 휴가 신청 ${actionLabel}`,
        body: `${managerName}님이 휴가 신청을 ${actionLabel}했습니다.`,
        url: `/attendance/vacation/${id}`,
      }).catch(() => {})
    } else if (type === "attendance_edit") {
      const { data: editReq, error: fetchError } = await supabaseAdmin
        .from("attendance_edit_requests")
        .select("user_id, date, direction, requested_time, lunch_break")
        .eq("id", id)
        .single()
      if (fetchError) throw new Error(fetchError.message)

      const { error: updateError } = await supabaseAdmin
        .from("attendance_edit_requests")
        .update({ status: action, reviewed_by: userId })
        .eq("id", id)
      if (updateError) throw new Error(updateError.message)

      if (action === "approved") {
        const newTimestamp = `${editReq.date}T${editReq.requested_time}:00+09:00`
        const column = editReq.direction === "in" ? "clock_in" : "clock_out"
        const updateData: Record<string, unknown> = { [column]: newTimestamp }
        if (editReq.direction === "out" && editReq.lunch_break !== null) {
          updateData.lunch_break = editReq.lunch_break
        }
        await supabaseAdmin
          .from("attendance_records")
          .update(updateData)
          .eq("user_id", editReq.user_id)
          .eq("date", editReq.date)
      }

      sendPushToUsers([editReq.user_id], {
        title: `📋 근태 수정 ${actionLabel}`,
        body: `${managerName}님이 근태 수정 요청을 ${actionLabel}했습니다.`,
        url: "/attendance",
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[admin attendance approve]", err)
    return NextResponse.json({ error: "처리에 실패했습니다" }, { status: 500 })
  }
}
