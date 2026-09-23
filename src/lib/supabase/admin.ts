import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses Row Level Security entirely.
 *
 * NEVER import this from a Client Component, or anything that could run in
 * the browser. It exists only for server-only code that needs to write to a
 * DIFFERENT user's row than whoever is making the request — which is
 * exactly the situation the Paddle webhook is in: Paddle's servers call it,
 * not a logged-in user, so there's no user session/RLS context to rely on.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. This must be added as a " +
        "server-only Vercel env var (never NEXT_PUBLIC_, never committed) " +
        "— see BILLING.md.",
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
