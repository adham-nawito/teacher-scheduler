-- Teacher Scheduler — schedule the reminder Edge Function to run every minute.
-- Run this in the Supabase SQL editor AFTER:
--   1. push_notifications.sql has been applied, and
--   2. the `send-session-reminders` Edge Function has been deployed, and
--   3. its secrets (VAPID_*, CRON_SECRET) have been set.
--
-- Replace both placeholders below before running:
--   <YOUR-PROJECT-REF>  — e.g. gydexrmibrufiqprlbqb
--   <YOUR-CRON-SECRET>  — the exact same value you set with
--                          `supabase secrets set CRON_SECRET=...`

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'send-session-reminders',
  '* * * * *', -- every minute
  $$
  select net.http_post(
    url := 'https://gydexrmibrufiqprlbqb.supabase.co/functions/v1/send-session-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer d575ab948eb19f0f8d397e8bfca43b9735dc3878bafe098a',
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
-- To remove it later:
--   select cron.unschedule('send-session-reminders');
