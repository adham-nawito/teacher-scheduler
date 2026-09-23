import type { SupabaseClient } from "@supabase/supabase-js";
import type { Subscription } from "@/lib/types";

/** The current user's subscription row, or null if one somehow doesn't exist yet. */
export async function fetchSubscription(
  supabase: SupabaseClient,
  userId: string,
): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as Subscription | null;
}

/**
 * Whether this subscription currently grants access to the app. Kept as a
 * pure function (no DB calls) so the exact same rule is used everywhere —
 * the app layout's server-side gate.
 */
export function hasActiveAccess(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  if (subscription.status === "active" || subscription.status === "exempt") {
    return true;
  }
  if (subscription.status === "trialing") {
    return new Date(subscription.trial_ends_at).getTime() > Date.now();
  }
  // 'past_due' and 'canceled' never grant access.
  return false;
}

/** Days left in the trial, rounded up, floored at 0. Only meaningful while status === 'trialing'. */
export function trialDaysLeft(subscription: Subscription): number {
  const ms = new Date(subscription.trial_ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}
