import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Roles that are allowed to reach the staff dashboard on admin.ephia.de.
// Everything else (including the future 'student' role used by public
// customer accounts on ephia.de) is bounced off the admin host even if
// they hold a valid Supabase session.
const STAFF_ROLES = new Set(["admin", "nutzer"]);
const ADMIN_HOST = "admin.ephia.de";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getSession() reads the JWT from the cookie locally — no network call.
  // Safe for route protection: the JWT is cryptographically signed and has an expiry.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user ?? null;

  // Protect dashboard routes. Require full-segment matches so unrelated
  // trees that happen to share a prefix with "/m" (e.g. /merch) don't
  // accidentally trigger the login redirect. Same pattern we apply in
  // middleware.ts for ADMIN_ONLY_PATHS / BOOKING_ONLY_PATHS.
  const path = request.nextUrl.pathname;
  const host = (request.headers.get("host") ?? "").split(":")[0];
  const isAdminHost = host === ADMIN_HOST;
  const isProtected =
    path === "/dashboard" ||
    path.startsWith("/dashboard/") ||
    path === "/m" ||
    path.startsWith("/m/");
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Resolve the role for this request. Cookie-cached so dashboard
  // layouts don't need a DB call on every navigation; the cookie is
  // refreshed whenever either bit is missing so a stale role cookie
  // can't lock a user into the wrong view forever. The kursbetreuung
  // flag is set on the same cadence (so layouts that read it stay in
  // sync) but only `role` is needed below for the admin-host gate.
  let role: string = "nutzer";

  if (user) {
    const existingRole = request.cookies.get("x-user-role")?.value;
    const existingKursbetreuung = request.cookies.get("x-is-kursbetreuung")?.value;
    if (!existingRole || existingKursbetreuung === undefined) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_kursbetreuung")
        .eq("id", user.id)
        .single();
      role = profile?.role ?? "nutzer";
      const isKursbetreuung = profile?.is_kursbetreuung === true;
      supabaseResponse.cookies.set("x-user-role", role, {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 3600,
      });
      supabaseResponse.cookies.set("x-is-kursbetreuung", isKursbetreuung ? "1" : "0", {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 3600,
      });
    } else {
      role = existingRole;
    }
  } else {
    supabaseResponse.cookies.delete("x-user-role");
    supabaseResponse.cookies.delete("x-is-kursbetreuung");
  }

  // Hard lock on admin.ephia.de: a valid Supabase session is necessary
  // but NOT sufficient. Once we open Supabase Auth to public customers
  // (role='student'), they would otherwise be able to navigate to
  // admin.ephia.de/dashboard with their normal session cookie and reach
  // staff-only screens. This gate redirects any non-staff role away
  // before the dashboard layout even renders, complementing the per-
  // route assertAdmin() checks on individual API endpoints.
  //
  // Bouncing to ephia.de root rather than /login here, because the
  // user is already authenticated — sending them to /login again would
  // either show a logged-in user the login form (confusing) or loop.
  if (user && isAdminHost && isProtected && !STAFF_ROLES.has(role)) {
    return NextResponse.redirect("https://ephia.de/");
  }

  return supabaseResponse;
}
