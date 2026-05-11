import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT")!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async () => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const currentTime = `${hh}:${mm}`;
  const currentDay = ["일", "월", "화", "수", "목", "금", "토"][now.getDay()];

  // 현재 시각에 알람이 설정된 사용자 조회
  const res = await fetch(`${supabaseUrl}/rest/v1/alarm_settings?select=id,alarm_on,alarm_time,alarm_days,meal_alarm_on,meal_alarm_time,meal_alarm_days`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  });
  const alarms = await res.json();

  for (const alarm of alarms) {
    const targets: { title: string; body: string }[] = [];

    if (alarm.alarm_on && alarm.alarm_time === currentTime && alarm.alarm_days?.includes(currentDay)) {
      targets.push({ title: "⏰ 근태 알림", body: "출근 시간이 되었습니다." });
    }
    if (alarm.meal_alarm_on && alarm.meal_alarm_time === currentTime && alarm.meal_alarm_days?.includes(currentDay)) {
      targets.push({ title: "🍽️ 식대 알림", body: "점심 시간이 되었습니다." });
    }

    if (targets.length === 0) continue;

    // 해당 유저의 푸시 구독 조회
    const subRes = await fetch(`${supabaseUrl}/rest/v1/push_subscriptions?user_id=eq.${alarm.id}&select=subscription`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });
    const subs = await subRes.json();

    for (const { subscription } of subs) {
      for (const payload of targets) {
        try {
          await webpush.sendNotification(subscription, JSON.stringify(payload));
        } catch {
          // 만료된 구독은 무시
        }
      }
    }
  }

  return new Response("ok");
});
