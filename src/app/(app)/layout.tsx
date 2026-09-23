import { redirect } from "next/navigation";
import NavBar from "@/components/NavBar";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";
import { createClient } from "@/lib/supabase/server";
import { fetchSubscription, hasActiveAccess } from "@/lib/billing";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards this, but guard again for safety.
  if (!user) redirect("/login");

  // Every route under (app) requires an active trial, subscription, or
  // exempt status. This check lives here (once, for every page in the
  // group) rather than duplicated on /calendar and /attendance separately.
  const subscription = await fetchSubscription(supabase, user.id);
  if (!hasActiveAccess(subscription)) redirect("/subscribe");

  return (
    <div className="min-h-dvh">
      <RegisterServiceWorker />
      <NavBar email={user.email ?? null} />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
