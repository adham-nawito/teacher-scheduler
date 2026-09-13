import { redirect } from "next/navigation";
import NavBar from "@/components/NavBar";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";
import { createClient } from "@/lib/supabase/server";

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

  return (
    <div className="min-h-dvh">
      <RegisterServiceWorker />
      <NavBar email={user.email ?? null} />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
