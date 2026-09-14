-- Teacher Scheduler — schedule the reminder Edge Function to run every minute.
--
-- This file is safe to commit to git: the shared secret it needs is never
-- written here. It's stored once in Supabase Vault (an encrypted secret
-- store built into Postgres) and referenced by name at run time instead.
--
-- Run this in the Supabase SQL editor AFTER:
--   1. push_notifications.sql has been applied, and
--   2. the `send-session-reminders` Edge Function has been deployed, and
--   3. its CRON_SECRET secret has been set to the SAME value you store in
--      Vault below (`supabase secrets set CRON_SECRET=...`) — the two must
--      match exactly, since the function checks the incoming header against
--      its own CRON_SECRET.

-- ---------------------------------------------------------------------------
-- Step 1 — store the shared secret in Vault (run this ONCE).
-- Generate a fresh random value yourself rather than reusing one that's
-- ever appeared anywhere else, e.g.:
--   node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
-- Paste that value below, run this block once, then don't leave the value
-- sitting in this file — delete it from your local copy after running it.
-- ---------------------------------------------------------------------------

select vault.create_secret(
  '<PASTE-YOUR-FRESH-RANDOM-SECRET-HERE-THEN-RUN-ONCE-THEN-DELETE-THIS-LINE>',
  'cron_secret',
  'Shared secret so pg_cron can authenticate to send-session-reminders'
);

-- ---------------------------------------------------------------------------
-- Step 2 — schedule the job. Replace <YOUR-PROJECT-REF> (not a secret, just
-- your project's id, e.g. from Settings -> General) and run.
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'send-session-reminders',
  '* * * * *', -- every minute
  $$
  select net.http_post(
    url := 'https://<YOUR-PROJECT-REF>.supabase.co/functions/v1/send-session-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'
      ),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- To check it's registered:
--   select * from cron.job;
-- To see recent run results (handy for debugging):
--   select * from cron.job_run_details order by start_time desc limit 20;
-- To remove the schedule later:
--   select cron.unschedule('send-session-reminders');
-- To rotate the secret later (update both here and in the Edge Function):
--   select vault.update_secret(
--     (select id from vault.decrypted_secrets where name = 'cron_secret'),
--     '<NEW-RANDOM-VALUE>'
--   );
