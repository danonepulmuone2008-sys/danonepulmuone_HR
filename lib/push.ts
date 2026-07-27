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
  payload: { title: string; body: string; url?: string },
) {
  if (!userIds.length) return
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) return

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )

  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("subscription")
    .in("user_id", userIds)

  if (!subs?.length) return

  await Promise.allSettled(
    subs.map(({ subscription }) =>
      webpush.sendNotification(subscription, JSON.stringify(payload))
    )
  )
}
