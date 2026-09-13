# Push notification reminders — setup

This adds a push notification 10-15 minutes before each session, sent to any
device where you tapped "Enable reminders." It costs nothing: Web Push
(the browser standard, not Firebase) is free, and the scheduler runs on
Supabase's free `pg_cron` extension since Vercel's free cron tier only
allows once-a-day jobs.

Do these steps in order. Steps 1-4 only need to happen once, ever.

## 1. Apply the new database schema

Supabase dashboard → SQL Editor → New query → paste the full contents of
[`supabase/push_notifications.sql`](supabase/push_notifications.sql) → Run.

This adds the `push_subscriptions` table, a `reminder_sent_at` column on
`sessions`, and a `sessions_due_for_reminder` view the reminder job reads
from.

## 2. Install the Supabase CLI and link your project

```bash
npm install -g supabase
supabase login
cd teacher-scheduler
supabase link --project-ref gydexrmibrufiqprlbqb
```

(Replace the project ref if yours differs — it's the same one from Settings
→ General → Project ID.)

## 3. Deploy the Edge Function

```bash
supabase functions deploy send-session-reminders --no-verify-jwt
```

The `--no-verify-jwt` flag is required here: Supabase normally rejects any
request that isn't carrying a valid Supabase user session, but the cron job
calling this function isn't a logged-in user — it authenticates with its own
shared secret instead (checked inside the function itself). Without this
flag, every call would get a 401 before your code even runs.

## 4. Set the function's secrets

```bash
supabase secrets set \
  VAPID_PUBLIC_KEY=BKLMTgU3osXEgtddg9YYurE2fIBBE2MjHd7W4tFwSWKX0j_hSCeLK9C4QSVb_iojrPqw0pgbtne3isR-Zk_wJ2E \
  VAPID_PRIVATE_KEY=aG-5brbLY43wto0bEDjDpSPshDaCSE8IKXrWjV2bA1U \
  VAPID_SUBJECT="mailto:you@example.com" \
  CRON_SECRET=d575ab948eb19f0f8d397e8bfca43b9735dc3878bafe098a
```

Replace `mailto:you@example.com` with your real email — push services use
this to contact you if your server is ever misbehaving. The VAPID keys and
cron secret above were freshly generated for this project; you're welcome to
keep them or generate your own (`node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`
for a new cron secret).

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` don't need to be set — Supabase
injects those into every Edge Function automatically.

## 5. Add the public VAPID key to Vercel

Vercel → your project → Settings → Environment Variables → add:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BKLMTgU3osXEgtddg9YYurE2fIBBE2MjHd7W4tFwSWKX0j_hSCeLK9C4QSVb_iojrPqw0pgbtne3isR-Zk_wJ2E
```

(Same public key as above — this half is safe to expose in the browser.
Never put `VAPID_PRIVATE_KEY` here.) Redeploy after adding it, since env var
changes don't apply to already-built deployments.

## 6. Schedule the cron job

Open [`supabase/pg_cron_schedule.sql`](supabase/pg_cron_schedule.sql), replace
the two placeholders (`<YOUR-PROJECT-REF>` and `<YOUR-CRON-SECRET>`) with your
real project ref and the `CRON_SECRET` value from step 4, then run it in the
SQL Editor.

## 7. Test it

1. Open the app on your phone. On iPhone, this **must** be through the
   home-screen icon (Safari → Share → Add to Home Screen → open from there),
   not a regular Safari tab — iOS only allows push permission requests from
   an installed PWA, and only on iOS 16.4+. Android/Chrome works from a
   regular tab too, but installing still gives the nicest experience.
2. Tap "Enable reminders" in the nav bar and allow the notification
   permission prompt.
3. Book a test session about 12-13 minutes from now.
4. Wait — you should get a push notification once it enters the 10-15 minute
   window, even if you've closed the app.

## Troubleshooting

- **No notification arrives:** check `select * from cron.job_run_details
  order by start_time desc limit 20;` in the SQL Editor to confirm the cron
  job is actually firing and see any error response. Also check Supabase
  dashboard → Edge Functions → `send-session-reminders` → Logs for errors
  from inside the function itself.
- **"Enable reminders" button does nothing / errors immediately:** open the
  browser console — a missing or wrong `NEXT_PUBLIC_VAPID_PUBLIC_KEY` on
  Vercel is the most common cause.
- **Works on Android, not on iPhone:** almost always means the app wasn't
  opened from the home-screen icon, or the iPhone is on an iOS version older
  than 16.4 (in which case push simply isn't possible there — no code fix
  exists for that).
- **A subscription stops working after a while:** this is expected and
  handled automatically — the Edge Function deletes any subscription the
  push service reports as permanently gone (e.g. after the app was
  uninstalled), so it'll just quietly stop trying for that device.
