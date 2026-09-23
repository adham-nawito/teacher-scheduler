-- Teacher Scheduler — subscriptions / billing gate.
-- Run this in the Supabase SQL editor AFTER schema.sql has already been applied.
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- One row per user, tracking trial/paid status. Deliberately separate from
-- `students`/`sessions` so its RLS can be far stricter than everything else.
-- ---------------------------------------------------------------------------

create table if not exists public.subscriptions (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  status                text not null default 'trialing'
                          check (status in ('trialing', 'active', 'past_due', 'canceled', 'exempt')),
  trial_ends_at         timestamptz not null,
  paddle_customer_id     text,
  paddle_subscription_id text,
  current_period_end    timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Users may read their own row (to show "trial ends in N days" / the reason
-- they're paywalled) — but there is NO insert/update/delete policy for the
-- regular authenticated role at all. This is deliberate: if a signed-in user
-- could write to this table, they could set their own status to 'active'
-- from the browser and skip paying entirely. The only things that may ever
-- write here are the Paddle webhook handler (using the service-role key,
-- which bypasses RLS) and you, directly, for exempt/testing accounts.
drop policy if exists "users can read own subscription" on public.subscriptions;
create policy "users can read own subscription"
  on public.subscriptions
  for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Auto-create a 7-day trial row the moment a new user signs up, so there's
-- never a window where a signed-in user has no subscription row at all.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (user_id, status, trial_ends_at)
  values (new.id, 'trialing', now() + interval '7 days')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_subscription on auth.users;
create trigger on_auth_user_created_subscription
  after insert on auth.users
  for each row execute function public.handle_new_user_subscription();

-- ---------------------------------------------------------------------------
-- One-time backfill: give any account that already existed before this
-- migration a fresh 7-day trial from right now (the trigger above only
-- fires for brand-new signups going forward). Safe to run more than once —
-- `on conflict do nothing` skips anyone who already has a row.
-- ---------------------------------------------------------------------------

insert into public.subscriptions (user_id, status, trial_ends_at)
select id, 'trialing', now() + interval '7 days'
from auth.users
on conflict (user_id) do nothing;

-- To mark a specific account as exempt (unlimited free access — for testing
-- accounts, or yourself) run, after the migration above:
--   update public.subscriptions set status = 'exempt', updated_at = now()
--   where user_id = (select id from auth.users where email = 'someone@example.com');
