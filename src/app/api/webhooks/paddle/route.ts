import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// IMPORTANT — read before debugging this file:
// This targets Paddle Billing (the current product, not legacy "Paddle
// Classic"). The signature format and event/field names below are my best
// understanding of Paddle's documented webhook format, but I wrote this
// without live access to Paddle's docs or a real sandbox to test against.
// If verification keeps failing or a field comes through as undefined,
// go to Paddle Dashboard -> Developer Tools -> Notifications, find a real
// delivery attempt, and look at exactly what was sent — that's ground
// truth, more reliable than this comment. Cross-check against
// https://developer.paddle.com/webhooks/overview too.

function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): boolean {
  const parts = Object.fromEntries(
    signatureHeader
      .split(";")
      .map((p) => p.split("=") as [string, string])
      .filter(([k, v]) => k && v),
  );
  const ts = parts.ts;
  const h1 = parts.h1;
  if (!ts || !h1) return false;

  const signedPayload = `${ts}:${rawBody}`;
  const expectedHex = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");

  const expectedBuf = Buffer.from(expectedHex, "hex");
  const actualBuf = Buffer.from(h1, "hex");
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

// Paddle subscription statuses -> our own status column.
const STATUS_MAP: Record<string, string> = {
  active: "active",
  trialing: "trialing",
  past_due: "past_due",
  paused: "past_due",
  canceled: "canceled",
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("paddle-signature") ?? "";
  const secret = process.env.PADDLE_WEBHOOK_SECRET;

  if (!secret) {
    console.error("PADDLE_WEBHOOK_SECRET is not set.");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  if (!verifyPaddleSignature(rawBody, signatureHeader, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: {
    event_type?: string;
    data?: {
      id?: string;
      status?: string;
      customer_id?: string;
      current_billing_period?: { ends_at?: string };
      custom_data?: { supabase_user_id?: string };
    };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = event.event_type ?? "";
  const data = event.data ?? {};
  const userId = data.custom_data?.supabase_user_id;

  if (!userId) {
    // Some event types (e.g. early transaction events before checkout
    // custom_data is attached) may not carry this — nothing to act on yet.
    return NextResponse.json({ received: true, skipped: "no supabase_user_id" });
  }

  const supabase = createAdminClient();

  try {
    switch (eventType) {
      case "subscription.created":
      case "subscription.updated":
      case "subscription.activated": {
        const mappedStatus = STATUS_MAP[data.status ?? ""] ?? "active";
        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: mappedStatus,
            paddle_customer_id: data.customer_id ?? null,
            paddle_subscription_id: data.id ?? null,
            current_period_end: data.current_billing_period?.ends_at ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
        if (error) throw error;
        break;
      }
      case "subscription.canceled": {
        const { error } = await supabase
          .from("subscriptions")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("user_id", userId);
        if (error) throw error;
        break;
      }
      default:
        // Other event types (e.g. transaction.completed) aren't acted on —
        // subscription.* already covers every status change we care about.
        break;
    }
  } catch (err) {
    console.error("Failed to process Paddle webhook:", eventType, err);
    // Still return 200 for signature-valid-but-processing-failed cases would
    // hide real bugs from Paddle's retry mechanism, so surface a 500 here —
    // Paddle will retry delivery on failure.
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
