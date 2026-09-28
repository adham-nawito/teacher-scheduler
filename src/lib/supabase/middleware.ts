import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request and guards routes.
 * Unauthenticated users are redirected to /login, except for the handful of
 * routes that must work without a session (the "/" landing page, login,
 * signup, forgot-password, the auth callback, and Paddle's webhook).
 * Signed-in users get bounced off the landing page and the auth pages
 * straight into /calendar — they've already seen the pitch.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        // Typed as `any[]` deliberately: this mirrors Supabase's own SSR
        // example and we don't want to depend on guessing an exact type
        // name from @supabase/ssr's internals.
        setAll(cookiesToSet: any[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run code between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic =
    // Exact match, not startsWith — every path "starts with /", so this
    // must only cover the landing page itself, not the whole app.
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/auth") ||
    // Paddle's webhook calls have no Supabase session cookie at all — this
    // route verifies its own signature instead, so it must never be
    // redirected to /login.
    pathname.startsWith("/api/webhooks");

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (
    user &&
    (pathname === "/" ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/signup"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/calendar";
    return NextResponse.redirect(url);
  }

  return response;
}
