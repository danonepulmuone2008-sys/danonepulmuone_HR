import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { sendPushToUsers, getManagerIds } from "@/lib/push"

export async function POST(req: Request) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? ""
    if (!token) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const { userIds, notifyManagers, title, body, url } = await req.json()

    let targetIds: string[] = userIds ?? []
    if (notifyManagers) {
      const managerIds = await getManagerIds()
      targetIds = [...new Set([...targetIds, ...managerIds])]
    }

    sendPushToUsers(targetIds, { title, body, url }).catch(() => {})
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[push/send]", err)
    return NextResponse.json({ error: "전송 실패" }, { status: 500 })
  }
}
