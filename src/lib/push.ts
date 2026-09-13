import type { SupabaseClient } from "@supabase/supabase-js";

/** Whether this browser can receive Web Push notifications at all. */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

/** Convert the VAPID public key (base64url string) into the byte array the Push API expects. */
function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

/** The current subscription for this device, if any. */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

/**
 * Requests notification permission, subscribes this device to push, and
 * saves the subscription to Supabase so the reminder job can reach it.
 * Throws if the user denies permission or the browser blocks it.
 */
export async function subscribeToPush(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  if (!isPushSupported()) {
    throw new Error("This browser doesn't support push notifications.");
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error("Push notifications aren't configured (missing VAPID key).");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    // Cast needed because @types/node and the DOM lib disagree on
    // Uint8Array's default generic parameter (ArrayBuffer vs the broader
    // ArrayBufferLike). The array here is always backed by a plain
    // ArrayBuffer at runtime (built via `new Uint8Array(length)`), so this
    // is a type-level mismatch only, not a real behavior change.
    applicationServerKey: base64UrlToUint8Array(publicKey) as BufferSource,
  });

  const json = subscription.toJSON();
  const keys = json.keys as { p256dh: string; auth: string } | undefined;
  if (!json.endpoint || !keys) {
    throw new Error("Subscription is missing required fields.");
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    { onConflict: "endpoint" },
  );

  if (error) throw error;
}

/** Unsubscribes this device and removes its row from Supabase. */
export async function unsubscribeFromPush(supabase: SupabaseClient): Promise<void> {
  const subscription = await getExistingSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  if (error) throw error;
}
