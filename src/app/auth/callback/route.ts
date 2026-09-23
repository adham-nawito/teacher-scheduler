import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Generic auth callback. Supabase redirects here with a `code` after either
 * an email confirmation link (signup) or a password reset link — we
 * exchange it for a session cookie, then send the user wherever `next`
 * points (defaults to /calendar; the reset-password flow passes
 * `?next=/reset-password`).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/calendar";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
