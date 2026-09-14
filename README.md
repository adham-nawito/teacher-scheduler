# Teacher Scheduler

A small, mobile-friendly web app for tutors to book sessions on a monthly
calendar and track attendance. Built with **Next.js (App Router)** and
**Supabase** (Postgres + Auth). Installable as a PWA on phones.

## Features

- **Login** with Google, or **continue as a guest** (an anonymous account, so
  guest data still persists and syncs across visits).
- **Month calendar** — pick any day, choose a time slot, enter a student name,
  and book a session.
- **Weekly recurrence** — one tick books the same weekday/time through the end
  of the current month.
- **Attendance matrix** — students down the side, session dates across the top,
  a checkbox in each cell to mark a session done, plus a done/booked total per
  student.
- **Edit a session** — change the student, date, or time from the calendar's
  day view. If it's part of a weekly series, choose whether the change applies
  to just that one occurrence or to it and every future occurrence (the
  weekday/date pattern itself can't be changed for a whole series — delete and
  rebook if you need a different weekday).
- **Duplicate recurring sessions to the next month** — one button re-books
  every recurring student's same weekday/time as a fresh series in the month
  you're viewing, with a review checklist first so you can leave out students
  who shouldn't continue. One-off (non-recurring) sessions are never
  duplicated.
- **Private by default** — Postgres row-level security means each teacher only
  ever sees their own students and sessions.
- **Push notification reminders** — an optional push 10-15 minutes before each
  session; see [`PUSH_NOTIFICATIONS.md`](PUSH_NOTIFICATIONS.md) for setup
  (separate from the steps below, since it needs a Supabase Edge Function and
  cron job, not just the web app).

## Tech

| Concern   | Choice                                   |
| --------- | ---------------------------------------- |
| Framework | Next.js 14 (App Router, TypeScript)      |
| Auth + DB | Supabase (Google OAuth + anonymous auth) |
| Styling   | Tailwind CSS                             |

## Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a project, then:

- **SQL Editor → New query** → paste the contents of
  [`supabase/schema.sql`](supabase/schema.sql) and run it. This creates the
  `students` and `sessions` tables and their row-level-security policies.
- **Authentication → Providers → Anonymous** → enable it (powers guest login).
- **Authentication → Providers → Google** → enable it and add your Google OAuth
  client ID/secret. In the Google Cloud console, add this authorized redirect
  URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`.
- **Authentication → URL Configuration** → set the Site URL to
  `http://localhost:3000` for local dev (and your production URL later), and add
  `http://localhost:3000/**` to the redirect allow-list.

### 2. Configure the app

```bash
cp .env.local.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
**Project Settings → API**.

### 3. Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Project structure

```
supabase/schema.sql              Database schema + RLS policies
supabase/push_notifications.sql  push_subscriptions table + reminder view (see PUSH_NOTIFICATIONS.md)
supabase/pg_cron_schedule.sql    Schedules the reminder Edge Function every minute
supabase/functions/              Deno Edge Function that sends the actual push
src/middleware.ts                Refreshes the session and guards routes
src/lib/supabase/                Browser / server / middleware Supabase clients
src/lib/dates.ts                 Calendar + recurrence date helpers
src/lib/data.ts                  All database reads/writes in one place
src/lib/push.ts                  Browser-side push subscribe/unsubscribe helpers
public/sw.js                     Service worker — receives push, opens the app
src/app/login/                   Google + guest login
src/app/auth/callback/           OAuth code exchange
src/app/(app)/calendar/          Month calendar + booking
src/app/(app)/attendance/        Attendance matrix
src/components/                  CalendarView, BookingModal, EditSessionModal, DuplicateMonthModal,
                                  AttendanceMatrix, NavBar, PushToggle
```

## Notes & possible next steps

- Recurrence is intentionally scoped to "weekly through the end of the current
  month", matching the way the calendar is browsed one month at a time.
- Deleting a session removes just that occurrence. Bulk-deleting a whole
  recurring series isn't built (the `recurrence_group` column makes it
  straightforward to add if it comes up).
- Editing a whole series can only change the student and/or time, not the
  weekday — moving a series to a different day of the week means deleting it
  and rebooking.
- To deploy, push to Vercel, set the two env vars, and update the Supabase Site
  URL / redirect allow-list to the production domain.
