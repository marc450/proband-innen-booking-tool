import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getVerifiedClaims } from "./claims";

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

  // Verifies the JWT's ES256 signature against the project's public key,
  // using a process-cached JWKS — local, no round trip. getSession() only
  // decoded the cookie without checking the signature, which is both why
  // auth-js logged an "may not be authentic" warning on every request and
  // why a forged token would have passed this gate.
  const claims = await getVerifiedClaims(supabase);
  const userId = (claims?.sub as string | undefined) ?? null;

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
  // Pages in the post-login MFA flow. They're auth-required (a session
  // must exist to reach them) but exempt from the AAL gate further
  // down, otherwise users with aal1 sessions would loop on the very
  // page that's supposed to upgrade them.
  const isMfaTransition = path === "/verify-2fa" || path === "/setup-2fa";
  if ((isProtected || isMfaTransition) && !userId) {
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
  //
  // Fail CLOSED on an unresolvable role: "" rather than "nutzer".
  // "nutzer" is a STAFF role, so defaulting to it meant a genuinely
  // authenticated session whose id has NO profiles row (an auth.users
  // row that never got a profile, a customer/student edge case) passed
  // the admin-host staff gate below and reached the dashboard. Mirrors
  // the same fail-closed fix already applied to getVerifiedAccess() in
  // @/lib/auth-verify for the API layer.
  let role: string = "";

  if (userId) {
    const existingRole = request.cookies.get("x-user-role")?.value;
    const existingKursbetreuung = request.cookies.get("x-is-kursbetreuung")?.value;
    const existingAutor = request.cookies.get("x-is-autor")?.value;
    if (!existingRole || existingKursbetreuung === undefined || existingAutor === undefined) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_kursbetreuung, is_autor")
        .eq("id", userId)
        .single();
      role =
        typeof profile?.role === "string" && profile.role.length > 0
          ? profile.role
          : "";
      const isKursbetreuung = profile?.is_kursbetreuung === true;
      const isAutor = profile?.is_autor === true;

      if (role) {
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
        supabaseResponse.cookies.set("x-is-autor", isAutor ? "1" : "0", {
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          maxAge: 3600,
        });
      } else {
        // Profileless session: cache nothing and clear whatever is
        // there. An empty role cookie would be indistinguishable from
        // "missing" to the readers in @/lib/auth, and caching any value
        // risks handing this session a role it hasn't earned. Dropping
        // the cookies costs one profiles lookup per request for these
        // sessions and guarantees they are re-resolved (and bounced)
        // every single time, not just on the first request.
        supabaseResponse.cookies.delete("x-user-role");
        supabaseResponse.cookies.delete("x-is-kursbetreuung");
        supabaseResponse.cookies.delete("x-is-autor");
      }
    } else {
      role = existingRole;
    }
  } else {
    supabaseResponse.cookies.delete("x-user-role");
    supabaseResponse.cookies.delete("x-is-kursbetreuung");
    supabaseResponse.cookies.delete("x-is-autor");
  }

  // Hard lock on admin.ephia.de: a valid Supabase session is necessary
  // but NOT sufficient. Once we open Supabase Auth to public customers
  // (role='student'), they would otherwise be able to navigate to
  // admin.ephia.de/dashboard with their normal session cookie and reach
  // staff-only screens. This gate redirects any non-staff role away
  // before the dashboard layout even renders, complementing the per-
  // route assertAdmin() checks on individual API endpoints. An
  // unresolvable role ("" — no profiles row) is non-staff too, so a
  // signed-but-profileless session lands here rather than falling
  // through to the dashboard.
  //
  // Bouncing to ephia.de root rather than /login here, because the
  // user is already authenticated — sending them to /login again would
  // either show a logged-in user the login form (confusing) or loop.
  if (userId && isAdminHost && (isProtected || isMfaTransition) && !STAFF_ROLES.has(role)) {
    return NextResponse.redirect("https://ephia.de/");
  }

  // ── 2FA gate ──────────────────────────────────────────────────────
  // Three states encoded by Supabase's AAL claims:
  //   • currentLevel=aal1, nextLevel=aal1 → user has no verified factor.
  //     ALL staff are forced through /setup-2fa. The whole staff
  //     dashboard touches encrypted patient data; everyone gets MFA.
  //   • currentLevel=aal1, nextLevel=aal2 → user HAS a verified factor
  //     but the current session hasn't stepped up. Bounce to /verify-2fa
  //     so they enter their TOTP code.
  //   • currentLevel=aal2 → fully authenticated. If they hit a transition
  //     page anyway (e.g. typed the URL, browser back), bounce them
  //     back to /dashboard so the transition pages don't render
  //     post-login.
  //
  // Only enforced on the admin host. The customer flow on ephia.de /
  // proband-innen.ephia.de uses Supabase auth too but doesn't gate by
  // MFA — students self-manage their accounts and 2FA isn't in scope
  // for the public funnel yet.
  if (userId && isAdminHost && (isProtected || isMfaTransition)) {
    // currentLevel comes straight off the verified `aal` claim. The old
    // code asked mfa.getAuthenticatorAssuranceLevel() for it, but that
    // helper reads session.user.factors internally — the same unverified
    // proxy that logs the warning. Reading the claim avoids that, and for
    // a stepped-up session it's all we need.
    const currentLevel = (claims?.aal as string | undefined) ?? "aal1";

    if (currentLevel === "aal2") {
      if (isMfaTransition) {
        // Already stepped up → don't render the transition pages.
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    } else {
      // Not stepped up. Which page they belong on depends on whether they
      // already have a verified factor, and that isn't in the token — so
      // this is the one branch that still needs the factor lookup. It only
      // runs for sessions mid-2FA-flow, not for normal dashboard traffic.
      const { data: aal } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const nextLevel = aal?.nextLevel ?? "aal1";

      if (nextLevel === "aal2") {
        // Has a verified factor, session not stepped up yet.
        if (path !== "/verify-2fa") {
          const url = request.nextUrl.clone();
          url.pathname = "/verify-2fa";
          return NextResponse.redirect(url);
        }
      } else {
        // Staff without any verified factor → must enroll. Reaches here
        // only after the staff-role check above, so role is admin or
        // nutzer.
        if (path !== "/setup-2fa") {
          const url = request.nextUrl.clone();
          url.pathname = "/setup-2fa";
          return NextResponse.redirect(url);
        }
      }
    }
  }

  return supabaseResponse;
}
