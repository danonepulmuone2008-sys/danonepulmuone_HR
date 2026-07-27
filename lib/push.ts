import webpush from "web-push"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function getManagerIds(): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from("users")
    .select("id")
    .in("role", ["admin", "manager"])
  return (data ?? []).map((u: { id: string }) => u.id)
}

export async function sendPushToUsers(
  userIds: string[],
  payload: { body: string; url?: string },
) {
  if (!userIds.length) return
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) {
    console.error("[push] VAPID 키 누락")
    return
  }

  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    )
  } catch (e) {
    console.error("[push] setVapidDetails 실패:", e)
    return
  }

  const { data: subs, error: subError } = await supabaseAdmin
    .from("push_subscriptions")
    .select("subscription")
    .in("user_id", userIds)

  if (subError) { console.error("[push] 구독 조회 실패:", subError); return }
  if (!subs?.length) { console.warn("[push] 구독 없음 userIds:", userIds); return }

  const results = await Promise.allSettled(
    subs.map(({ subscription }) =>
      webpush.sendNotification(subscription, JSON.stringify(payload))
    )
  )
  results.forEach((r, i) => {
    if (r.status === "rejected") console.error(`[push] 전송 실패 [${i}]:`, r.reason)
  })
}
