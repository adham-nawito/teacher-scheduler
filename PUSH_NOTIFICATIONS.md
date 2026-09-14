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
supabase link --project-ref <project_ref>
```

(It's the same one from Settings → General → Project ID.)

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

Generate your own fresh values — never reuse an example value from a doc,
even one you wrote yourself, since anything that's ever been pasted
somewhere shared should be treated as already compromised:

```bash
# VAPID keypair (paste the two output lines into the command below)
node -e "
const crypto = require('crypto');
const ecdh = crypto.createECDH('prime256v1');
ecdh.generateKeys();
let pub = ecdh.getPublicKey();
let priv = ecdh.getPrivateKey();
if (priv.length < 32) priv = Buffer.concat([Buffer.alloc(32 - priv.length), priv]);
const b64url = (b) => b.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+\$/,'');
console.log('VAPID_PUBLIC_KEY=' + b64url(pub));
console.log('VAPID_PRIVATE_KEY=' + b64url(priv));
"

# Cron secret
node -e "console.log('CRON_SECRET=' + require('crypto').randomBytes(24).toString('hex'))"
```

Then:

```bash
supabase secrets set \
  VAPID_PUBLIC_KEY=<paste-from-above> \
  VAPID_PRIVATE_KEY=<paste-from-above> \
  VAPID_SUBJECT="mailto:you@example.com" \
  CRON_SECRET=<paste-from-above>
```

Replace `mailto:you@example.com` with your real email — push services use
this to contact you if your server is ever misbehaving.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` don't need to be set — Supabase
injects those into every Edge Function automatically.

**This file used to contain real generated key values here as a convenience.
They were removed after being committed to a public repo — treat any value
that was ever in this file's git history as permanently compromised and
already rotated, not as something safe to reuse.**

## 5. Add the public VAPID key to Vercel

Vercel → your project → Settings → Environment Variables → add:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<the VAPID_PUBLIC_KEY value from step 4>
```

(This half is safe to expose in the browser — it's public by design. Never
put `VAPID_PRIVATE_KEY` here or anywhere client-side.) Redeploy after adding
it, since env var changes don't apply to already-built deployments.

## 6. Schedule the cron job

Open [`supabase/pg_cron_schedule.sql`](supabase/pg_cron_schedule.sql) and
follow the two steps in it: first store your `CRON_SECRET` value in Supabase
Vault (an encrypted secret store, so the real value never needs to be typed
into a file that gets committed), then run the scheduling block with your
project ref filled in. If you already had this cron job scheduled with the
old plain-text approach, drop it first with
`select cron.unschedule('send-session-reminders');` before re-running the
new version — otherwise you'll end up with two competing jobs.

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
