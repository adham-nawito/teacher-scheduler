"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getExistingSubscription,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push";

type Status = "checking" | "unsupported" | "on" | "off";

export default function PushToggle() {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPushSupported()) {
      setStatus("unsupported");
      return;
    }
    getExistingSubscription()
      .then((sub) => setStatus(sub ? "on" : "off"))
      .catch(() => setStatus("off"));
  }, []);

  async function handleToggle() {
    setError(null);
    setBusy(true);
    const supabase = createClient();
    try {
      if (status === "on") {
        await unsubscribeFromPush(supabase);
        setStatus("off");
      } else {
        const { data } = await supabase.auth.getUser();
        if (!data.user) throw new Error("Not signed in.");
        await subscribeToPush(supabase, data.user.id);
        setStatus("on");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "unsupported" || status === "checking") return null;

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        disabled={busy}
        title={
          status === "on"
            ? "Session reminders are on for this device"
            : "Get a push notification 10-15 minutes before each session"
        }
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition disabled:opacity-60 ${
          status === "on"
            ? "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
            : "border-gray-300 text-gray-600 hover:bg-gray-50"
        }`}
      >
        <BellIcon filled={status === "on"} />
        <span className="hidden sm:inline">
          {status === "on" ? "Reminders on" : "Enable reminders"}
        </span>
      </button>
      {error && (
        <p className="absolute right-0 top-full z-10 mt-1 w-56 rounded-lg bg-red-50 px-2 py-1.5 text-xs text-red-700 shadow-sm">
          {error}
        </p>
      )}
    </div>
  );
}

function BellIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 3 1 4.5 1.5 5.5H4.5C5 12.5 6 11 6 8Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}
