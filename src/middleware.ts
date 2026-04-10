import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

const ADMIN_DOMAIN = "admin.ephia.de";
const BOOKING_DOMAIN = "proband-innen.ephia.de";

// Routes that belong to the admin domain only
const ADMIN_ONLY_PATHS = ["/dashboard", "/login", "/m"];
// Routes that belong to the booking domain only
const BOOKING_ONLY_PATHS = ["/book", "/courses"];

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

  // On proband-innen.ephia.de: block admin-only paths.
  if (hostname === BOOKING_DOMAIN) {
    const isAdminPath = ADMIN_ONLY_PATHS.some((p) => pathname.startsWith(p));
    if (isAdminPath) {
      return NextResponse.rewrite(new URL("/not-found", request.url));
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
