# Teacher Scheduler

A simple, mobile-friendly app for private tutors: book sessions on a monthly
calendar, and keep track of who actually showed up. Built with **Next.js**
and **Supabase**, installable on a phone as a PWA.

## What it does

Create an account with an email and password and you land on a month
calendar. Tap any day to book a session — just a student's name and a time
slot. Tick "repeat weekly" and
that same slot books itself for the rest of the month. A separate Attendance
page shows every student down the side and every session date across the
top, so at a glance you can tick off which sessions actually happened. New
accounts get a 7-day free trial; after that, continuing requires a
subscription.

## Features

- **Sign up with email and password** — a 7-day free trial starts
  automatically, no card required to try it. Includes email confirmation on
  signup and a self-service "forgot password" flow.
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

| Concern            | Choice                                                    |
| ------------------- | ---------------------------------------------------------- |
| Framework           | Next.js 14 (App Router, TypeScript), Tailwind CSS         |
| Database + Auth     | Supabase (Postgres, email/password auth)                  |
| Billing             | Paddle (hosted checkout + webhooks) — see [`BILLING.md`](BILLING.md) |
| Push notifications  | Web Push (VAPID) via a Supabase Edge Function + `pg_cron`  |
| Hosting             | Vercel                                                     |

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
2. **Authentication → URL Configuration** → set the Site URL to
   `http://localhost:3000` for now, and add `http://localhost:3000/**` to the
   redirect allow-list. (Email/password auth is enabled by default — no
   provider setup needed, unlike the OAuth-based approach this app used to
   use.)
3. Optional: **Authentication → Providers → Email** → review "Confirm
   email" (recommended: keep it on) and the minimum password length
   (the signup form enforces 8 characters client-side; set this to match or
   be stricter).

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
your Supabase project's **Settings → API** page. Leave the
`NEXT_PUBLIC_VAPID_*` and `NEXT_PUBLIC_PADDLE_*` variables blank for now —
those belong to push notifications and billing respectively, each with their
own setup guide, and neither is required to run the core app.

### 4. Run it

```bash
npm run dev
```

Open http://localhost:3000.

Note: without the billing migration applied (see [`BILLING.md`](BILLING.md)),
every account effectively has no subscription row and will be sent to
`/subscribe`, which will error without Paddle configured. For pure local
development on the calendar/attendance features, either apply
`supabase/subscriptions.sql` and mark your own test account `exempt` (see
BILLING.md), or skip the `(app)` route group's subscription check locally by
commenting it out temporarily — don't ship that commented-out.

## Deploying to production

The app itself deploys to Vercel like any Next.js app — push to GitHub,
import the repo on [vercel.com](https://vercel.com), and add the same two
Supabase environment variables from step 3 above in the Vercel project
settings. Once you have a production URL, go back to Supabase's
**Authentication → URL Configuration** and add it to the Site URL and
redirect allow-list the same way you did for `localhost`.

Push notifications and billing both need extra setup beyond this — see
[`PUSH_NOTIFICATIONS.md`](PUSH_NOTIFICATIONS.md) and
[`BILLING.md`](BILLING.md).

## Project structure

```
supabase/schema.sql              Database schema + RLS policies
supabase/subscriptions.sql       Trial/subscription table + trigger (see BILLING.md)
supabase/push_notifications.sql  push_subscriptions table + reminder view (see PUSH_NOTIFICATIONS.md)
supabase/pg_cron_schedule.sql    Schedules the reminder Edge Function every minute
                                 (the secret it needs lives in Supabase Vault, never in this file)
supabase/functions/              Deno Edge Function that actually sends the push
src/middleware.ts                Refreshes the session and guards routes
src/lib/supabase/                Browser / server / middleware / admin (service-role) Supabase clients
src/lib/billing.ts               Subscription status helpers, shared by the app layout and paywall
src/lib/dates.ts                 Calendar + recurrence date helpers
src/lib/data.ts                  All database reads/writes in one place
src/lib/push.ts                  Browser-side push subscribe/unsubscribe helpers
public/sw.js                     Service worker — receives push, opens the app
src/app/page.tsx                 Public landing page (marketing, pricing, FAQ)
src/app/login/                   Email/password sign in
src/app/signup/                  Registration + email confirmation
src/app/forgot-password/         Request a password reset email
src/app/reset-password/          Set a new password after clicking the email link
src/app/auth/callback/           Exchanges the code from a confirmation/reset email link
src/app/subscribe/               Paywall shown once the trial ends
src/app/api/webhooks/paddle/     Syncs subscription status from Paddle
src/app/(app)/calendar/          Month calendar, booking, editing
src/app/(app)/attendance/        Attendance matrix
src/components/                  CalendarView, BookingModal, EditSessionModal,
                                 DuplicateMonthModal, AttendanceMatrix, NavBar,
                                 PushToggle, SubscribeButton
```

## Known limitations

- Editing a whole recurring series can change the student and/or time, but
  not the weekday. Moving a series to a different day means deleting it and
  rebooking.
- Deleting a session only removes that one occurrence — there's no
  bulk-delete for a whole series yet (the `recurrence_group` column makes
  this straightforward to add later if needed).
- The Paddle integration was written without live access to Paddle's docs —
  test it carefully in sandbox mode before relying on it (details in
  [`BILLING.md`](BILLING.md)).

## Security notes

This repo is public on GitHub, so a few rules matter more here than in a
typical private project:

- **Never commit a real secret value** — not in `.env`, not in a doc meant to
  be copy-pasted, not "just for convenience." Every setup doc here shows a
  command to *generate* a value, never a filled-in one.
- **The push notification cron secret lives in Supabase Vault**, referenced
  by name in `supabase/pg_cron_schedule.sql` — never written into that file
  directly. See the comments in that file for how to set or rotate it.
- **The Supabase service role / secret key is server-only.** It's what lets
  the Paddle webhook write to any user's subscription row, bypassing RLS
  entirely — it belongs in Vercel's env vars only, never `NEXT_PUBLIC_`,
  never committed.
- **Never put a token inside a git remote URL**
  (`https://user:TOKEN@github.com/...`) — it sits in plain text in
  `.git/config` on disk. Use a credential manager or `gh auth login` instead.
- If a secret ever does end up exposed (committed, pasted somewhere, shown in
  a screenshot), the fix is to rotate it, not just remove it from the current
  file — it's still recoverable from git history otherwise.
