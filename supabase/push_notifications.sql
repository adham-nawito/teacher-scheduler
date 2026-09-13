-- Teacher Scheduler — push notification support.
-- Run this in the Supabase SQL editor AFTER schema.sql has already been applied.
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- Track whether a session has already had its reminder sent, so the
-- reminder job (running every minute) never sends the same one twice.
-- ---------------------------------------------------------------------------

alter table public.sessions
  add column if not exists reminder_sent_at timestamptz;

-- ---------------------------------------------------------------------------
-- One row per subscribed device (a teacher could have a phone + a laptop,
-- each gets its own row). `endpoint` uniquely identifies the browser's push
-- channel for that device, so re-subscribing the same device just updates it.
-- ---------------------------------------------------------------------------

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push subscriptions are owned by the teacher" on public.push_subscriptions;
create policy "push subscriptions are owned by the teacher"
  on public.push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Helper view used by the reminder Edge Function: every session that starts
-- in 10-15 minutes (Africa/Cairo time — see note below), hasn't already had
-- a reminder sent, joined with the student name and the teacher's push
-- subscriptions.
--
-- NOTE ON TIME ZONE: session_date/start_time are stored as plain date/time
-- with no time zone attached — they represent whatever the browser's local
-- clock showed when the session was booked. This view assumes that's always
-- Africa/Cairo. That's fine for a single teacher working from one time
-- zone; if this app ever needs to support teachers in different time zones,
-- a `time_zone` column would need to be added per user and used here instead
-- of the hard-coded 'Africa/Cairo'.
-- ---------------------------------------------------------------------------

create or replace view public.sessions_due_for_reminder as
select
  s.id as session_id,
  s.user_id,
  s.session_date,
  s.start_time,
  st.name as student_name,
  (s.session_date + s.start_time) at time zone 'Africa/Cairo' as starts_at
from public.sessions s
join public.students st on st.id = s.student_id
where
  s.reminder_sent_at is null
  and (s.session_date + s.start_time) at time zone 'Africa/Cairo'
      between now() + interval '10 minutes' and now() + interval '15 minutes';

-- This view is only ever read by the Edge Function using the service role
-- key (which bypasses RLS), so it doesn't need its own RLS policy — but we
-- still revoke it from the anon/authenticated roles as a safety net so it
-- can never be queried directly from the browser.
revoke all on public.sessions_due_for_reminder from anon, authenticated;
