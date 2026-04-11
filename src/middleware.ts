import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

const ADMIN_DOMAIN = "admin.ephia.de";
const BOOKING_DOMAIN = "proband-innen.ephia.de";
// Shadow marketing domain — staging ground for the future ephia.de marketing
// site. Serves the /kurse tree with clean URLs and is blocked from search
// indexing until we cut over.
const KURSE_DOMAIN = "kurse.ephia.de";

// Routes that belong to the admin domain only
const ADMIN_ONLY_PATHS = ["/dashboard", "/login", "/m"];
// Routes that belong to the booking domain only
const BOOKING_ONLY_PATHS = ["/book", "/courses"];

// Paths that kurse.ephia.de should pass through untouched (framework assets,
// API routes, etc). Everything else on that host is treated as a /kurse slug.
const KURSE_PASSTHROUGH_RE = /^\/(api|_next|kurse|favicon\.ico|robots\.txt|sitemap\.xml)(\/|$)/;

function withNoindex(response: NextResponse): NextResponse {
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

// Phone-only UA regex. Deliberately excludes iPad (it handles the 3-pane
// desktop layout fine on its larger viewport).
const PHONE_UA_RE = /iPhone|iPod|Android.*Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i;

// Best-effort mapping from the desktop `/dashboard/*` tree to the mobile
// `/m/*` tree. Paths not in this list fall back to the mobile inbox.
const DASHBOARD_TO_MOBILE: Array<[RegExp, string]> = [
  [/^\/dashboard\/inbox(\/|$)/, "/m/inbox"],
  [/^\/dashboard\/bookings(\/|$)/, "/m/buchungen"],
  [/^\/dashboard\/patients(\/|$)/, "/m/kontakte"],
  [/^\/dashboard\/behandlungstermine(\/|$)/, "/m/termine"],
  [/^\/dashboard\/auszubildende(\/|$)/, "/m/termine"],
  [/^\/dashboard(\/|$)/, "/m"],
];

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const hostname = host.split(":")[0]; // strip port if present
  const pathname = request.nextUrl.pathname;
  const ua = request.headers.get("user-agent") ?? "";
  const isPhone = PHONE_UA_RE.test(ua);

  // On admin.ephia.de: send root to dashboard (auth redirect to /login happens downstream)
  // and block booking-only paths.
  if (hostname === ADMIN_DOMAIN) {
    if (pathname === "/") {
      const target = isPhone ? "/m" : "/dashboard";
      return NextResponse.redirect(new URL(target, request.url));
    }

    // Phone users hitting a desktop /dashboard/* URL (bookmark, email link,
    // shared URL) should be forwarded to the equivalent /m screen so the
    // 3-pane desktop layout never crunches onto a small viewport.
    if (isPhone && pathname.startsWith("/dashboard")) {
      for (const [re, target] of DASHBOARD_TO_MOBILE) {
        if (re.test(pathname)) {
          const url = request.nextUrl.clone();
          url.pathname = target;
          // Drop query params from deep links we can't translate across trees
          url.search = "";
          return NextResponse.redirect(url);
        }
      }
    }

    const isBookingPath = BOOKING_ONLY_PATHS.some((p) => pathname.startsWith(p));
    if (isBookingPath) {
      return NextResponse.rewrite(new URL("/not-found", request.url));
    }
  }

  // On kurse.ephia.de: shadow marketing site.
  //  - Root "/" → rewrite to /kurse (the shadow home page)
  //  - /{slug} → rewrite to /kurse/{slug} so clean URLs work
  //  - /kurse/* paths are passed through as-is
  //  - The Proband:innen funnel lives on the booking domain — redirect
  //    /werde-proband-in and /kurse/werde-proband-in over to the root of
  //    proband-innen.ephia.de so the /book/* deep links resolve correctly.
  //  - All responses are tagged noindex, nofollow so Google never indexes it
  if (hostname === KURSE_DOMAIN) {
    if (pathname === "/werde-proband-in" || pathname === "/kurse/werde-proband-in") {
      return NextResponse.redirect(`https://${BOOKING_DOMAIN}/`, 308);
    }

    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/kurse";
      return withNoindex(NextResponse.rewrite(url));
    }

    if (!KURSE_PASSTHROUGH_RE.test(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = `/kurse${pathname}`;
      return withNoindex(NextResponse.rewrite(url));
    }

    return withNoindex(NextResponse.next());
  }

  // On proband-innen.ephia.de: booking domain.
  //  - Root "/" → rewrite to the Werde Proband:in landing page so the bare
  //    domain serves the marketing + booking funnel.
  //  - "/werde-proband-in" → same rewrite so the clean URL works.
  //  - Block admin-only paths.
  //  - Everything else (/book, /courses, …) passes through untouched.
  if (hostname === BOOKING_DOMAIN) {
    const isAdminPath = ADMIN_ONLY_PATHS.some((p) => pathname.startsWith(p));
    if (isAdminPath) {
      return NextResponse.rewrite(new URL("/not-found", request.url));
    }

    if (pathname === "/" || pathname === "/werde-proband-in") {
      const url = request.nextUrl.clone();
      url.pathname = "/kurse/werde-proband-in";
      return NextResponse.rewrite(url);
    }
  }

  // Run Supabase auth session (handles dashboard auth protection)
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
