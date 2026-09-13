-- Teacher Scheduler — database schema + row level security.
-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Safe to re-run: it uses "if not exists" / "drop policy if exists" guards.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.students (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null check (char_length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  -- A teacher cannot have two students with the exact same name.
  unique (user_id, name)
);

create table if not exists public.sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  student_id  uuid not null references public.students (id) on delete cascade,
  -- Date of the session (no time zone; a session belongs to a calendar day).
  session_date date not null,
  -- Start time of the slot, e.g. '16:00'.
  start_time  time not null,
  -- Marked true when the teacher confirms the session was delivered.
  completed   boolean not null default false,
  -- Groups sessions created together as one recurring series (nullable = one-off).
  recurrence_group uuid,
  created_at  timestamptz not null default now(),
  -- One student can only have one session at a given date + start time.
  unique (student_id, session_date, start_time)
);

create index if not exists sessions_user_date_idx
  on public.sessions (user_id, session_date);

create index if not exists students_user_idx
  on public.students (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — each user only ever sees / mutates their own rows.
-- ---------------------------------------------------------------------------

alter table public.students enable row level security;
alter table public.sessions enable row level security;

drop policy if exists "students are owned by the teacher" on public.students;
create policy "students are owned by the teacher"
  on public.students
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "sessions are owned by the teacher" on public.sessions;
create policy "sessions are owned by the teacher"
  on public.sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
