// Supabase Edge Function (Deno runtime) — NOT built or type-checked by
// Next.js. It's deployed separately via the Supabase CLI:
//   supabase functions deploy send-session-reminders
//
// Triggered every minute by a pg_cron job (see ../../pg_cron_schedule.sql).
// It looks at the `sessions_due_for_reminder` view (sessions starting in
// 10-15 minutes that haven't been reminded yet), sends a Web Push
// notification to every device the teacher has subscribed, and marks the
// session as reminded so it's never sent twice.
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically by
// the Edge Function runtime — no need to set them manually. Everything else
// (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET) must be
// set with `supabase secrets set`.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

type DueSession = {
  session_id: string;
  user_id: string;
  session_date: string;
  start_time: string;
  student_name: string;
  starts_at: string;
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

Deno.serve(async (req: Request) => {
  // Only pg_cron (which knows the shared secret) is allowed to trigger this.
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
  const vapidSubject = Deno.env.get("VAPID_SUBJECT")!;

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: dueSessions, error: dueError } = await supabase
    .from("sessions_due_for_reminder")
    .select("*") as { data: DueSession[] | null; error: unknown };

  if (dueError) {
    console.error("Failed to load due sessions:", dueError);
    return new Response(JSON.stringify({ error: String(dueError) }), { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const session of dueSessions ?? []) {
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", session.user_id) as { data: PushSubscriptionRow[] | null };

    // Explicit timeZone is required here — without it this would format in
    // the Edge Function runtime's default zone (UTC), not the teacher's
    // actual local time, silently showing the wrong hour in the notification.
    const time = new Date(session.starts_at).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Africa/Cairo",
    });

    const payload = JSON.stringify({
      title: `Session with ${session.student_name} in 10-15 minutes`,
      body: `Starts at ${time}`,
      url: "/calendar",
      tag: `session-${session.session_id}`,
    });

    for (const sub of subs ?? []) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        );
        sent++;
      } catch (err) {
        failed++;
        const statusCode = (err as { statusCode?: number }).statusCode;
        // 404/410 means the browser has permanently invalidated this
        // subscription (uninstalled, permission revoked, etc.) — clean it up.
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error(`Push failed for subscription ${sub.id}:`, err);
        }
      }
    }

    // Mark as reminded regardless of per-device outcome so a single bad
    // subscription can't cause this session to be retried every minute.
    await supabase
      .from("sessions")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", session.session_id);
  }

  return new Response(
    JSON.stringify({ processed: dueSessions?.length ?? 0, sent, failed }),
    { headers: { "Content-Type": "application/json" } },
  );
});
