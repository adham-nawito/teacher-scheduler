import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchSubscription, hasActiveAccess } from "@/lib/billing";
import SubscribeButton from "@/components/SubscribeButton";
import SignOutLink from "@/components/SignOutLink";

export default async function SubscribePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const subscription = await fetchSubscription(supabase, user.id);
  // If they already have access (e.g. they just paid and came back here
  // directly), don't show a paywall — send them into the app.
  if (hasActiveAccess(subscription)) redirect("/calendar");

  const heading =
    subscription?.status === "canceled"
      ? "Your subscription was canceled"
      : subscription?.status === "past_due"
        ? "Your last payment didn't go through"
        : "Your free trial has ended";

  return (
    <main className="flex min-h-dvh items-center justify-center bg-brand-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
        <h1 className="text-xl font-semibold text-gray-900">{heading}</h1>
        <p className="mt-2 text-sm text-gray-500">
          Subscribe to keep booking sessions and tracking attendance.
        </p>
        <div className="mt-6 flex justify-center">
          <SubscribeButton email={user.email ?? ""} userId={user.id} />
        </div>
        <SignOutLink />
      </div>
    </main>
  );
}
