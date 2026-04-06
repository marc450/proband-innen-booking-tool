import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

const ADMIN_DOMAIN = "admin.ephia.de";
const BOOKING_DOMAIN = "proband-innen.ephia.de";

// Routes that belong to the admin domain only
const ADMIN_ONLY_PATHS = ["/dashboard", "/login", "/m"];
// Routes that belong to the booking domain only
const BOOKING_ONLY_PATHS = ["/book", "/courses"];

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const hostname = host.split(":")[0]; // strip port if present
  const pathname = request.nextUrl.pathname;

  // On admin.ephia.de: send root to dashboard (auth redirect to /login happens downstream)
  // and block booking-only paths.
  if (hostname === ADMIN_DOMAIN) {
    if (pathname === "/") {
      // Detect mobile devices via User-Agent and redirect accordingly
      const ua = request.headers.get("user-agent") ?? "";
      const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      const target = isMobile ? "/m" : "/dashboard";
      return NextResponse.redirect(new URL(target, request.url));
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
