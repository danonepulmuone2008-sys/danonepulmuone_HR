import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

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

    if (type === "business_trip") {
      const { error } = await supabaseAdmin
        .from("business_trip_requests")
        .update({ status: action })
        .eq("id", id)
      if (error) throw new Error(error.message)
    } else if (type === "vacation") {
      const { error } = await supabaseAdmin
        .from("vacation_requests")
        .update({ status: action })
        .eq("id", id)
      if (error) throw new Error(error.message)
    } else if (type === "attendance_edit") {
      const { data: editReq, error: fetchError } = await supabaseAdmin
        .from("attendance_edit_requests")
        .select("user_id, date, direction, requested_time")
        .eq("id", id)
        .single()
      if (fetchError) throw new Error(fetchError.message)

      const { error: updateError } = await supabaseAdmin
        .from("attendance_edit_requests")
        .update({ status: action })
        .eq("id", id)
      if (updateError) throw new Error(updateError.message)

      if (action === "approved") {
        // KST 시간으로 timestamp 구성 (UTC+9)
        const newTimestamp = `${editReq.date}T${editReq.requested_time}:00+09:00`
        const column = editReq.direction === "in" ? "clock_in" : "clock_out"
        await supabaseAdmin
          .from("attendance_records")
          .update({ [column]: newTimestamp })
          .eq("user_id", editReq.user_id)
          .eq("date", editReq.date)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[admin attendance approve]", err)
    return NextResponse.json({ error: "처리에 실패했습니다" }, { status: 500 })
  }
}
