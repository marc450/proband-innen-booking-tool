import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  // Cache user role in a cookie so the layout doesn't need a DB call
  if (user) {
    const existingRole = request.cookies.get("x-user-role")?.value;
    if (!existingRole) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      const role = profile?.role ?? "admin";
      supabaseResponse.cookies.set("x-user-role", role, {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 3600,
      });
    }
  } else {
    supabaseResponse.cookies.delete("x-user-role");
  }

  return supabaseResponse;
}
