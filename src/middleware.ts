import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

const ADMIN_DOMAIN = "admin.ephia.de";
const BOOKING_DOMAIN = "proband-innen.ephia.de";
// Shadow marketing domain — staging ground for the future ephia.de marketing
// site. Serves the /kurse tree with clean URLs and is blocked from search
// indexing until we cut over.
const KURSE_DOMAIN = "kurse.ephia.de";
// Production marketing domain. Serves the same tree as KURSE_DOMAIN but
// is fully indexable and runs the LW migration redirect map below so old
// LearnWorlds URLs preserve their Google rankings via 301s.
const MARKETING_DOMAIN = "ephia.de";
const WWW_MARKETING_DOMAIN = "www.ephia.de";
// LMS subdomain (post-cutover home of the LearnWorlds course player).
const LEARN_DOMAIN = "learn.ephia.de";

// Routes that belong to the admin domain only
const ADMIN_ONLY_PATHS = ["/dashboard", "/login", "/m"];
// Routes that belong to the booking domain only
const BOOKING_ONLY_PATHS = ["/book", "/courses"];

// Paths that kurse.ephia.de should pass through untouched (framework assets,
// API routes, etc). Everything else on that host is treated as a /kurse slug.
const KURSE_PASSTHROUGH_RE = /^\/(api|_next|kurse|merch|team|favicon\.ico|robots\.txt|sitemap\.xml)(\/|$)/;

// LearnWorlds → Next.js URL migration redirect map. Every entry is a
// pathname that ranks (or recently ranked) on Google for the old LW
// marketing site at ephia.de and needs a 301 to its closest equivalent
// on the new Next.js app, otherwise the URL drops out of search and we
// lose organic clicks.
//
// Targets are absolute paths on the marketing host; the path-prefix
// cases (/path-player*, /blog/*, /course/*) are handled in code below
// since they need query-string preservation or wildcard matching.
//
// Source: GSC export of top ranking URLs as of cutover prep, plus
// hand-mapped LMS-back-redirects for old course-player links.
const LW_MIGRATION_REDIRECTS: Record<string, string> = {
  // LW kept course pages at the bare slug; we live under /kurse/, so
  // the rewrite inside marketing handler turns these into the right
  // internal path automatically. Only entries below need an explicit
  // 301 because the slug itself changed or the page lives outside
  // /kurse/.

  // Slug renames (LW slug → new clean slug)
  "/botox-kurs-zahnaerzte": "/botox-kurs-fuer-zahnaerzte",
  "/botox-schulung": "/botox-fortbildung",
  "/botox-online-kurs": "/botox-onlinekurs",
  "/aufbaukurs-therapeutische-indikationen":
    "/aufbaukurs-therapeutische-indikationen-botulinum",
  "/kurs-aesthetische-medizin": "/curriculum-botulinum",

  // Pages that live at root (/team) instead of as a /kurse/ slug
  "/unser-team": "/team",
  "/dozent-innen": "/team",

  // Renamed pages
  "/unsere-vision": "/vision",
  "/unsere-didaktik": "/didaktik",
  "/datenschutz-proband-innen": "/datenschutz",
  "/terms": "/agb",

  // Old LW /course/ tree → new /kurse/ slugs
  "/course/minikurs-botulinum": "/kostenloser-botox-kurs",
  "/course/aufbaukurs-botulinum-periorale-zone":
    "/aufbaukurs-botulinum-periorale-zone",
};

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

    const isBookingPath = BOOKING_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
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

    // Team page lives at /team (not under the /kurse/ tree) so any old
    // /kurse/team link redirects to the canonical URL.
    if (pathname === "/kurse/team" || pathname.startsWith("/kurse/team/")) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.replace(/^\/kurse\/team/, "/team");
      return NextResponse.redirect(url, 308);
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

  // On ephia.de / www.ephia.de: production marketing site.
  //  1. www → bare-domain canonical 301 (concentrate SEO on one host).
  //  2. LW migration redirect map — old slugs → new equivalents, 301.
  //  3. /path-player + /start + /blog/* path-prefix redirects to LMS or home.
  //  4. /werde-proband-in → booking domain (mirror kurse.ephia.de).
  //  5. /kurse/team* → /team* (canonicalise the team URL).
  //  6. Rewrite "/" → "/kurse" and "/{slug}" → "/kurse/{slug}" so the
  //     marketing tree under src/app/kurse/* renders with clean URLs.
  //  7. Pass everything else (kurse/, _next, api, team, …) through.
  // No noindex on this host — it's the canonical, indexable home.
  if (hostname === MARKETING_DOMAIN || hostname === WWW_MARKETING_DOMAIN) {
    // 1. www → bare-domain canonical
    if (hostname === WWW_MARKETING_DOMAIN) {
      const target = new URL(
        pathname + request.nextUrl.search,
        `https://${MARKETING_DOMAIN}`,
      );
      return NextResponse.redirect(target, 301);
    }

    // 2. LW migration redirect map (exact pathname match → 301)
    const mappedTarget = LW_MIGRATION_REDIRECTS[pathname];
    if (mappedTarget) {
      const target = mappedTarget.startsWith("http")
        ? mappedTarget + request.nextUrl.search
        : new URL(
            mappedTarget + request.nextUrl.search,
            `https://${MARKETING_DOMAIN}`,
          ).toString();
      return NextResponse.redirect(target, 301);
    }

    // 3. Path-prefix redirects
    //    /path-player[*] and /start* — LMS lives on learn.ephia.de.
    //    Preserve query string so the LW course-player params survive.
    if (pathname === "/path-player" || pathname.startsWith("/path-player")) {
      return NextResponse.redirect(
        `https://${LEARN_DOMAIN}${pathname}${request.nextUrl.search}`,
        301,
      );
    }
    if (pathname === "/start" || pathname.startsWith("/start/")) {
      return NextResponse.redirect(`https://${LEARN_DOMAIN}${pathname}`, 301);
    }
    //    /blog/* — old LW blog tree, no equivalent yet, redirect to home
    //    so the URL doesn't drop into 404 land.
    if (pathname === "/blog" || pathname.startsWith("/blog/")) {
      return NextResponse.redirect(
        new URL("/", `https://${MARKETING_DOMAIN}`),
        301,
      );
    }

    // 4. Werde Proband:in funnel lives on the booking domain
    if (
      pathname === "/werde-proband-in" ||
      pathname === "/kurse/werde-proband-in"
    ) {
      return NextResponse.redirect(`https://${BOOKING_DOMAIN}/`, 308);
    }

    // 5. /kurse/team[*] → /team[*] (team page lives at root, not under
    // /kurse). Mirror the canonicalisation we do on KURSE_DOMAIN.
    if (pathname === "/kurse/team" || pathname.startsWith("/kurse/team/")) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.replace(/^\/kurse\/team/, "/team");
      return NextResponse.redirect(url, 308);
    }

    // 6. Root → /kurse home
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/kurse";
      return NextResponse.rewrite(url);
    }

    // 6b. Clean-URL rewrite: /{slug} → /kurse/{slug}. This is what makes
    // ephia.de/grundkurs-botulinum render the same content as the
    // internal /kurse/grundkurs-botulinum page, with the clean URL
    // visible to the user and to Google.
    if (!KURSE_PASSTHROUGH_RE.test(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = `/kurse${pathname}`;
      return NextResponse.rewrite(url);
    }

    // 7. Passthrough (kurse/, _next, api, team, robots.txt, sitemap.xml).
    return NextResponse.next();
  }

  // On proband-innen.ephia.de: booking domain.
  //  - Root "/" → rewrite to the Werde Proband:in landing page so the bare
  //    domain serves the marketing + booking funnel.
  //  - "/werde-proband-in" → same rewrite so the clean URL works.
  //  - Block admin-only paths.
  //  - Everything else (/book, /courses, …) passes through untouched.
  if (hostname === BOOKING_DOMAIN) {
    const isAdminPath = ADMIN_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
    if (isAdminPath) {
      return NextResponse.rewrite(new URL("/not-found", request.url));
    }

    // The private booking funnel is only meant to be reached via
    // doctor-emailed links. Tag every response with X-Robots-Tag so the
    // URL is dropped from Google's index even if the bot somehow reaches
    // it (e.g. via leaked link). Defense in depth: the layout also sets
    // a noindex meta tag and robots.ts disallows the whole host.
    if (pathname === "/book/privat" || pathname.startsWith("/book/privat/")) {
      const response = NextResponse.next();
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
      return response;
    }

    if (pathname === "/" || pathname === "/werde-proband-in") {
      const url = request.nextUrl.clone();
      url.pathname = "/kurse/werde-proband-in";
      return NextResponse.rewrite(url);
    }

    // The /kurse/* tree is marketing and lives on kurse.ephia.de. If a
    // user lands on proband-innen.ephia.de/kurse/... (e.g. from an old
    // link), bounce them to the real marketing domain so the relative
    // CTA hrefs on that page resolve to the right place. Exception: the
    // /kurse/werde-proband-in landing is served from this domain above.
    if (
      pathname.startsWith("/kurse/") &&
      pathname !== "/kurse/werde-proband-in" &&
      !pathname.startsWith("/kurse/werde-proband-in/")
    ) {
      const target = new URL(pathname + request.nextUrl.search, `https://${KURSE_DOMAIN}`);
      return NextResponse.redirect(target, 308);
    }

    // Merch shop lives on kurse.ephia.de/merch. Same redirect treatment.
    if (pathname === "/merch" || pathname.startsWith("/merch/")) {
      const target = new URL(pathname + request.nextUrl.search, `https://${KURSE_DOMAIN}`);
      return NextResponse.redirect(target, 308);
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
