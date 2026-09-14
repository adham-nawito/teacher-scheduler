# Teacher Scheduler

A simple, mobile-friendly app for private tutors: book sessions on a monthly
calendar, and keep track of who actually showed up. Built with **Next.js**
and **Supabase**, installable on a phone as a PWA.

## What it does

Open the app, sign in, and you land on a month calendar. Tap any day to book
a session — just a student's name and a time slot. Tick "repeat weekly" and
that same slot books itself for the rest of the month. A separate Attendance
page shows every student down the side and every session date across the
top, so at a glance you can tick off which sessions actually happened.

## Features

- **Sign in with Google, or start as a guest** — no account setup required
  for a guest to try it, and their data still persists across visits.
- **Book a session** from the month calendar: pick a day, a time, and type
  the student's name.
- **Weekly recurrence** — one checkbox books the same weekday and time every
  week through the end of the month.
- **Edit a session** afterward — change the student, date, or time. For a
  recurring session, choose whether the change applies to just that date or
  to every future occurrence too.
- **Carry a recurring student into next month** with one click — shows a
  checklist first so you can leave out anyone who isn't continuing.
- **Attendance matrix** — students down the side, session dates across the
  top, a checkbox per cell to mark a session done.
- **Optional push notification** 10-15 minutes before each session, on phone
  or desktop. Free to run, no app store involved — see
  [`PUSH_NOTIFICATIONS.md`](PUSH_NOTIFICATIONS.md).
- **Installable on a phone** — add it to the home screen and it opens full
  screen, like a native app.
- **Private by default** — each teacher only ever sees their own students
  and sessions (enforced with Postgres row-level security, not just app
  logic).

## Tech stack

| Concern           | Choice                                              |
| ------------------ | --------------------------------------------------- |
| Framework          | Next.js 14 (App Router, TypeScript), Tailwind CSS   |
| Database + Auth    | Supabase (Postgres, Google OAuth + anonymous auth)  |
| Push notifications | Web Push (VAPID) via a Supabase Edge Function + `pg_cron` |
| Hosting            | Vercel                                              |

## Getting started (local development)

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a project, then:

1. **SQL Editor → New query** → paste in
   [`supabase/schema.sql`](supabase/schema.sql) and run it. This creates the
   `students` and `sessions` tables with row-level security already applied.
2. **Authentication → Providers → Anonymous** → enable it (this is what
   powers "continue as a guest").
3. **Authentication → Providers → Google** → enable it, adding your Google
   OAuth client ID/secret. In the Google Cloud console, set the authorized
   redirect URI to `https://<your-project-ref>.supabase.co/auth/v1/callback`.
4. **Authentication → URL Configuration** → set the Site URL to
   `http://localhost:3000` for now, and add `http://localhost:3000/**` to the
   redirect allow-list.

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
your Supabase project's **Settings → API** page. Leave
`NEXT_PUBLIC_VAPID_PUBLIC_KEY` blank for now — that one's only needed for
push notifications, which have their own setup guide.

### 4. Run it

```bash
npm run dev
```

Open http://localhost:3000.

## Project structure

```
supabase/schema.sql              Database schema + RLS policies
supabase/push_notifications.sql  push_subscriptions table + reminder view (see PUSH_NOTIFICATIONS.md)
supabase/pg_cron_schedule.sql    Schedules the reminder Edge Function every minute
                                 (the secret it needs lives in Supabase Vault, never in this file)
supabase/functions/              Deno Edge Function that actually sends the push
src/middleware.ts                Refreshes the session and guards routes
src/lib/supabase/                Browser / server / middleware Supabase clients
src/lib/dates.ts                 Calendar + recurrence date helpers
src/lib/data.ts                  All database reads/writes in one place
src/lib/push.ts                  Browser-side push subscribe/unsubscribe helpers
public/sw.js                     Service worker — receives push, opens the app
src/app/login/                   Google + guest login
src/app/auth/callback/           OAuth code exchange
src/app/(app)/calendar/          Month calendar, booking, editing
src/app/(app)/attendance/        Attendance matrix
src/components/                  CalendarView, BookingModal, EditSessionModal,
                                 DuplicateMonthModal, AttendanceMatrix, NavBar, PushToggle
```

## Known limitations

- Editing a whole recurring series can change the student and/or time, but
  not the weekday. Moving a series to a different day means deleting it and
  rebooking.
- Deleting a session only removes that one occurrence — there's no
  bulk-delete for a whole series yet (the `recurrence_group` column makes
  this straightforward to add later if needed).
