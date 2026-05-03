import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ssoLogin } from "@/lib/learnworlds";

// Custom SSO bridge for LearnWorlds.
//
// The flow:
//   LW (logged-out user clicks login / hits payment gate)
//     → 302 to https://proband-innen.ephia.de/api/auth/lw-sso?…
//     → if no Supabase session: 302 to /kurse/start?next=<this URL>
//     → user logs in on /kurse/start, /kurse/start bounces to `next`
//     → we POST /admin/api/sso to LW with email or lw_user_id
//     → 302 to the short-lived signed URL LW returns
//
// Identifier policy:
//   - If we have auszubildende.lw_user_id, send `user_id` to LW (no
//     profile overwrite, no email-mismatch risk).
//   - Otherwise send `email` + `username` so LW can create or find
//     the user. We persist the returned LW user_id back onto
//     auszubildende so the next call uses the user_id path.
//
// Error policy:
//   - Configuration / network errors are logged and surfaced as a
//     500 with a short message. Marc's escape hatch when SSO is fully
//     wedged is https://account.learnworlds.com/login — see the LW
//     custom SSO docs.

// LW's outbound SSO bounce hasn't been documented to us yet, so be
// permissive about which query param carries the post-login URL. The
// first non-empty value wins. We log the others so we can narrow
// this down once we see real traffic.
const REDIRECT_PARAM_CANDIDATES = [
  "redirectUrl",
  "redirect_url",
  "redirect",
  "returnUrl",
  "return_url",
  "r",
] as const;

function pickRedirectUrl(searchParams: URLSearchParams): string | null {
  for (const key of REDIRECT_PARAM_CANDIDATES) {
    const v = searchParams.get(key);
    if (v && v.trim()) return v.trim();
  }
  return null;
}

// Same-origin path check for the `next` param we hand /kurse/start.
// Must start with a single "/" and not "//" (which browsers treat as
// a protocol-relative URL → off-site redirect).
function isSafeRelativePath(p: string): boolean {
  return p.startsWith("/") && !p.startsWith("//");
}

// Build the absolute URL of the current request so /kurse/start can
// bounce back to us with the same query intact.
function currentUrl(req: NextRequest): string {
  return req.nextUrl.pathname + req.nextUrl.search;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const action = (sp.get("action") ?? "login").toLowerCase();
  const lwRedirect = pickRedirectUrl(sp);

  // ── 1. passwordReset action: short-circuit. LW asked us to reset
  //    the user's password; bounce them to our own reset flow.
  if (action === "passwordreset" || action === "password_reset") {
    const email = sp.get("email") ?? "";
    const resetUrl = new URL("/kurse/reset-password", req.nextUrl.origin);
    if (email) resetUrl.searchParams.set("email", email);
    return NextResponse.redirect(resetUrl);
  }

  // ── 2. Require a Supabase session. If absent, hand off to the
  //    /kurse/start login funnel and ask it to bounce back here.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) {
    const next = currentUrl(req);
    const startUrl = new URL("/kurse/start", req.nextUrl.origin);
    if (isSafeRelativePath(next)) startUrl.searchParams.set("next", next);
    return NextResponse.redirect(startUrl);
  }

  const userEmail = user.email.toLowerCase();

  // ── 3. Look up the auszubildende row for first_name + lw_user_id.
  //    Match by primary email OR alias, like check-email does.
  const admin = createAdminClient();
  let auszubildende: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    lw_user_id: string | null;
  } | null = null;

  const { data: aliasHit } = await admin
    .from("auszubildende_emails")
    .select("auszubildende_id")
    .eq("email", userEmail)
    .maybeSingle();
  if (aliasHit) {
    const { data } = await admin
      .from("auszubildende")
      .select("id, first_name, last_name, lw_user_id")
      .eq("id", aliasHit.auszubildende_id)
      .maybeSingle();
    if (data) auszubildende = data;
  }
  if (!auszubildende) {
    const { data } = await admin
      .from("auszubildende")
      .select("id, first_name, last_name, lw_user_id")
      .ilike("email", userEmail)
      .maybeSingle();
    if (data) auszubildende = data;
  }

  // Where to land the user inside LW after the SSO handshake. If LW
  // didn't tell us, default to the LW root so the user at least lands
  // on a sensible page rather than a 404. The doc requires a full URL.
  const redirectUrl =
    lwRedirect && /^https?:\/\//i.test(lwRedirect)
      ? lwRedirect
      : "https://www.ephia.de/";

  // ── 4. Call LW. user_id wins if we have it; otherwise email +
  //    username so LW creates a fresh user when needed.
  try {
    const sso = await ssoLogin(
      auszubildende?.lw_user_id
        ? {
            user_id: auszubildende.lw_user_id,
            redirectUrl,
          }
        : {
            email: userEmail,
            username:
              [auszubildende?.first_name, auszubildende?.last_name]
                .filter(Boolean)
                .join(" ")
                .trim() || userEmail,
            redirectUrl,
          },
    );

    // Self-heal the link: if we sent email and LW returned a user_id,
    // persist it so future SSOs go through the user_id branch (no
    // profile overwrite, no email-mismatch risk).
    if (
      auszubildende &&
      !auszubildende.lw_user_id &&
      sso.user_id
    ) {
      await admin
        .from("auszubildende")
        .update({ lw_user_id: sso.user_id })
        .eq("id", auszubildende.id);
    }

    return NextResponse.redirect(sso.url);
  } catch (err) {
    console.error("[lw-sso] failed", {
      email: userEmail,
      action,
      lwRedirect,
      err: err instanceof Error ? err.message : String(err),
    });
    return new NextResponse(
      "Login bei LearnWorlds fehlgeschlagen. Bitte versuche es in einer Minute erneut.",
      { status: 500 },
    );
  }
}
