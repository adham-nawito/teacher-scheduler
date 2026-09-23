"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { createClient } from "@/lib/supabase/client";
import { hasActiveAccess } from "@/lib/billing";
import type { Subscription } from "@/lib/types";

/**
 * Opens Paddle's hosted checkout overlay and waits for the webhook to mark
 * the account active before continuing into the app.
 *
 * NOTE: this targets Paddle Billing (the current product) via
 * @paddle/paddle-js. I couldn't verify this against Paddle's live docs while
 * writing it (no web access from this environment) — if `Checkout.open` or
 * the event shape below throws, cross-check against
 * https://developer.paddle.com/paddlejs/overview, since third-party SDKs do
 * change their API surface between versions.
 */
export default function SubscribeButton({
  email,
  userId,
}: {
  email: string;
  userId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [status, setStatus] = useState<"idle" | "opening" | "waiting">("idle");
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    const environment =
      process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox";
    if (!clientToken) return;

    initializePaddle({
      token: clientToken,
      environment,
      eventCallback: (event) => {
        if (event.name === "checkout.completed") startWaitingForWebhook();
      },
    }).then((instance) => setPaddle(instance ?? null));

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startWaitingForWebhook() {
    setStatus("waiting");
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (data && hasActiveAccess(data as Subscription)) {
        if (pollRef.current) clearInterval(pollRef.current);
        router.replace("/calendar");
        router.refresh();
        return;
      }
      // ~40 seconds of polling, then give up quietly — the webhook may just
      // be slow; the user can refresh manually once it lands.
      if (attempts >= 20 && pollRef.current) {
        clearInterval(pollRef.current);
      }
    }, 2000);
  }

  function openCheckout() {
    const priceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID;
    if (!paddle || !priceId) {
      setError(
        "Billing isn't configured yet — see BILLING.md (NEXT_PUBLIC_PADDLE_PRICE_ID is missing).",
      );
      return;
    }
    setStatus("opening");
    paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: { email },
      customData: { supabase_user_id: userId },
    });
  }

  if (status === "waiting") {
    return (
      <p className="text-sm text-gray-600">
        Payment received — activating your account, this takes a few
        seconds… (if this page doesn't move on within a minute, refresh it)
      </p>
    );
  }

  return (
    <div>
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        onClick={openCheckout}
        disabled={!paddle || status === "opening"}
        className="rounded-xl bg-brand-500 px-5 py-3 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
      >
        {status === "opening" ? "Opening checkout…" : "Subscribe"}
      </button>
    </div>
  );
}
