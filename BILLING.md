# Billing setup (Paddle)

This adds a 7-day free trial followed by a paywall: every new account gets
a trial automatically the moment they sign up, and once it ends they must
subscribe via Paddle to keep using the app. Billing is entirely separate from
auth — it doesn't matter whether sign-up happens via email/password or
anything else, the trigger fires on any new row in `auth.users`. Billing is
also separate from the core app — skip this file if you're just running the
calendar/attendance features.

**A note on accuracy:** I wrote the Paddle integration (`SubscribeButton.tsx`
and `api/webhooks/paddle/route.ts`) without live access to Paddle's docs or a
sandbox to test against. The overall approach (hosted checkout + signed
webhooks) is solid, but exact field/event names may not match Paddle's
current API precisely. Test everything in Paddle's **sandbox** mode first,
and use Paddle Dashboard → Developer Tools → Notifications to see the real
payloads it actually sends — that's ground truth if anything here doesn't
match. Cross-check https://developer.paddle.com/webhooks/overview and
https://developer.paddle.com/paddlejs/overview if something throws.

## 1. Apply the database migration

Supabase dashboard → SQL Editor → New query → paste the full contents of
[`supabase/subscriptions.sql`](supabase/subscriptions.sql) → Run.

This creates the `subscriptions` table (locked down so only the webhook —
using the service role key — or you directly can ever change a status; a
signed-in user cannot write to their own row), a trigger that starts a
7-day trial for every new sign-up, and a one-time backfill for any accounts
that already existed before this migration.

**Do this before deploying the app-side changes** — the app layout queries
this table on every page load; if the table doesn't exist yet, every page
under `/calendar` and `/attendance` will error for everyone.

## 2. Create a Paddle account and a sandbox product

1. Sign up at [paddle.com](https://paddle.com). Use **Sandbox mode** (a
   toggle in the dashboard) for everything in this section — don't touch
   live mode yet.
2. Catalog → Products → create a product (e.g. "Teacher Scheduler") with a
   recurring monthly price. Copy the **Price ID** (starts with `pri_`).
3. Developer Tools → Authentication → create a **client-side token** (safe
   to expose in the browser — this is what lets Paddle.js open checkout).
4. Developer Tools → Notifications → create a webhook destination:
   - URL: `https://<your-vercel-domain>/api/webhooks/paddle`
   - Subscribe to at least: `subscription.created`, `subscription.updated`,
     `subscription.activated`, `subscription.canceled`.
   - Copy the **signing secret** it gives you.

## 3. Set environment variables

**In Vercel → your project → Settings → Environment Variables**, add all of
these (and in your local `.env.local` for testing):

```
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=<the client-side token from step 2.3>
NEXT_PUBLIC_PADDLE_ENV=sandbox
NEXT_PUBLIC_PADDLE_PRICE_ID=<the pri_... id from step 2.2>
```

And these two **server-only** (do not prefix with `NEXT_PUBLIC_` — that
would expose them in the browser bundle):

```
PADDLE_WEBHOOK_SECRET=<the signing secret from step 2.4>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase Settings -> API Keys -> "Secret keys" section>
```

The Supabase secret key (this used to be called `service_role` — Supabase
renamed it in their newer dashboard, same underlying thing) bypasses Row
Level Security entirely. It's what lets the webhook update a subscription
row that isn't its own. Never put it in a file that gets committed — Vercel
env vars only.

Redeploy after adding these — env var changes don't apply to a deployment
that already finished building.

## 4. Test end to end in sandbox

1. Sign up with a new email/password account, confirm a `subscriptions` row
   appears with `status = 'trialing'`.
2. To test the paywall without waiting 7 days, manually expire your own
   trial in the SQL Editor:
   ```sql
   update public.subscriptions set trial_ends_at = now() - interval '1 minute'
   where user_id = (select id from auth.users where email = 'you@example.com');
   ```
3. Reload the app — you should land on `/subscribe`.
4. Click Subscribe, complete checkout using
   [Paddle's sandbox test card numbers](https://developer.paddle.com/concepts/payment-methods/credit-debit-card#sandbox-testing).
5. Confirm the webhook actually fired: Paddle Dashboard → Developer Tools →
   Notifications → your destination → delivery log. Then confirm
   `subscriptions.status` flipped to `active` in Supabase.
6. The `/subscribe` page should pick this up within a few seconds (it polls)
   and move you into `/calendar` automatically.

## 5. Go live

1. In Paddle, switch to live mode, recreate the product/price there (sandbox
   and live are separate), and create a live client-side token and a live
   webhook destination pointing at the same production URL.
2. Update the Vercel env vars with the live values, and change
   `NEXT_PUBLIC_PADDLE_ENV` to `production`.
3. Redeploy.

## Exempt / testing accounts

There's no UI for this by design — it's meant to be something only you
control, directly in the database:

```sql
update public.subscriptions
set status = 'exempt', updated_at = now()
where user_id = (select id from auth.users where email = 'someone@example.com');
```

An exempt account never sees the paywall, regardless of trial or payment
status, and there's no way for a user to grant this to themselves.

## Troubleshooting

- **Webhook returns 401:** the signature didn't verify — almost always
  means `PADDLE_WEBHOOK_SECRET` in Vercel doesn't match the signing secret
  shown in Paddle's dashboard for that specific webhook destination
  (sandbox and live each have their own secret).
- **Checkout completes but the app never unblocks:** check the webhook
  delivery log in Paddle first (did it even fire, and did it get a 200?),
  then check the Vercel function logs for `/api/webhooks/paddle` for a
  processing error.
- **Everyone gets blocked immediately after deploying:** you likely deployed
  the app changes before running `supabase/subscriptions.sql` — see step 1.
