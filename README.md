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
- **Private by default** — Postgres row-level security means each teacher only
  ever sees their own students and sessions.

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
supabase/schema.sql          Database schema + RLS policies
src/middleware.ts            Refreshes the session and guards routes
src/lib/supabase/            Browser / server / middleware Supabase clients
src/lib/dates.ts             Calendar + recurrence date helpers
src/lib/data.ts              All database reads/writes in one place
src/app/login/               Google + guest login
src/app/auth/callback/       OAuth code exchange
src/app/(app)/calendar/      Month calendar + booking
src/app/(app)/attendance/    Attendance matrix
src/components/              CalendarView, BookingModal, AttendanceMatrix, NavBar
```

## Notes & possible next steps

- Recurrence is intentionally scoped to "weekly through the end of the current
  month", matching the way the calendar is browsed one month at a time.
- Deleting a session removes just that occurrence. Bulk-deleting a whole
  recurring series would be a natural follow-up (the `recurrence_group` column
  is already stored for this).
- To deploy, push to Vercel, set the two env vars, and update the Supabase Site
  URL / redirect allow-list to the production domain.
