"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Pathnames that map to the Werde Proband:in funnel start when served
// from the booking domain. usePathname returns "/" and "/werde-proband-in"
// here because middleware rewrites both to /kurse/werde-proband-in
// without touching the URL bar — and "/kurse/werde-proband-in" itself
// for direct hits.
const FUNNEL_PATHS = new Set([
  "/",
  "/werde-proband-in",
  "/kurse/werde-proband-in",
]);

// Production host that serves the funnel. We must scope by host because
// kurse.ephia.de also has a "/" page (the marketing home) and that
// page must keep the full header. Local dev and Railway previews stay
// on the full header by default — to test the minimal variant locally,
// hit /kurse/werde-proband-in directly (it falls outside this rule).
const FUNNEL_HOST = "proband-innen.ephia.de";

type SubLink = {
  label: string;
  href: string;
  // When true the entry shows in the dropdown but is not clickable.
  // Used for curricula that don't have landing pages yet.
  disabled?: boolean;
  // Optional note shown beside the label, e.g. "Coming soon" for
  // curricula that are being prepared.
  note?: string;
};

type NavLink = {
  label: string;
  href: string;
  subLinks?: SubLink[];
};

const NAV_LINKS: NavLink[] = [
  {
    // Lernpfade = curated multi-course tracks. Parent link points at
    // the active track so the parent itself is never a dead "#".
    label: "Lernpfade",
    href: "/kurse/curriculum-botulinum",
    subLinks: [
      { label: "Curriculum Botulinum", href: "/kurse/curriculum-botulinum" },
      { label: "Curriculum Dermalfiller", href: "#", disabled: true, note: "Coming soon" },
      { label: "Curriculum Hautpflege", href: "#", disabled: true, note: "Coming soon" },
    ],
  },
  // "Alle Kurse" = direct link to the full overview grid, no dropdown.
  { label: "Alle Kurse", href: "/kurse/unsere-kurse" },
  {
    label: "Über EPHIA",
    href: "https://www.ephia.de/ueber-ephia",
    subLinks: [
      { label: "Unsere Vision", href: "/kurse/vision" },
      { label: "Unser Team", href: "/team" },
      { label: "Unsere Community", href: "/kurse/community" },
      { label: "Unsere Didaktik", href: "/kurse/didaktik" },
    ],
  },
  { label: "Werde Proband:in", href: "https://proband-innen.ephia.de/" },
  { label: "Merch ✨", href: "/merch" },
  { label: "FAQ & Kontakt", href: "/kurse/faq-kontakt" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const pathname = usePathname();

  // Detect the booking-domain funnel client-side: SSR renders the full
  // header by default (so kurse.ephia.de and any preview host always
  // get it), then on mount we read window.location and swap to the
  // minimal variant only when we're on the production booking host
  // AND on a funnel pathname. The brief flash on the funnel page
  // itself is acceptable — it's the only place the swap fires.
  const [isFunnel, setIsFunnel] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onFunnelHost = window.location.hostname === FUNNEL_HOST;
    const onFunnelPath = !!pathname && FUNNEL_PATHS.has(pathname);
    // One-time browser-only detection on mount; the linter assumes
    // setState-in-effect is a cascading-render anti-pattern, but here
    // it's the canonical way to read window.location safely after
    // hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsFunnel(onFunnelHost && onFunnelPath);
  }, [pathname]);

  // Auth-aware Login CTA. SSR renders the unauthenticated state; on
  // mount we ask the Supabase client whether a session exists. Brief
  // flash from "Login" to "Mein Konto" on first paint for logged-in
  // users is acceptable — the alternative (server-side session check
  // in the layout) would force this page off the static cache, which
  // matters more for SEO than the flash matters for UX.
  //
  // We also subscribe to auth-state changes so logging out via
  // /mein-konto's "Abmelden" button immediately flips the CTA back to
  // "Login" without a page reload.
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setIsLoggedIn(!!data.session);
    })();
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsLoggedIn(!!session);
      },
    );
    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const toggleMobileSection = (label: string) => {
    setMobileExpanded((current) => (current === label ? null : label));
  };

  // Werde Proband:in funnel start: keep the bar + logo for brand
  // continuity, drop the nav and the Login CTA so nothing pulls the
  // visitor out of the funnel.
  if (isFunnel) {
    return (
      <header className="sticky top-0 z-40 bg-[#FAEBE1]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="flex items-center h-14 md:h-16">
            <Link
              href="https://ephia.de/"
              className="flex items-center shrink-0"
              aria-label="EPHIA"
            >
              <Image
                src="/logos/ephia-logo.png"
                alt="EPHIA"
                width={2394}
                height={589}
                priority
                quality={95}
                sizes="220px"
                className="h-8 md:h-9 w-auto"
              />
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 bg-[#FAEBE1]/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo always points at the marketing home. Uses an absolute
              kurse.ephia.de URL so visitors on proband-innen.ephia.de
              (where this header is rendered for the werde-proband-in
              page) are bounced back to the marketing site instead of
              staying on the booking funnel. */}
          <Link
            href="https://kurse.ephia.de/"
            className="flex items-center shrink-0"
            aria-label="EPHIA"
          >
            <Image
              src="/logos/ephia-logo.png"
              alt="EPHIA"
              width={2394}
              height={589}
              priority
              quality={95}
              sizes="220px"
              className="h-8 md:h-9 w-auto"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-7">
            {NAV_LINKS.map((link) =>
              link.subLinks ? (
                <div key={link.label} className="relative group">
                  {/* Parent of a dropdown is not a link — only the sub-items
                      navigate. Rendered as a span (kept buttonless so the
                      hover chevron rotation from the group: selector still
                      works cleanly). */}
                  <span
                    className="flex items-center gap-1 text-base font-normal text-black group-hover:text-[#0066FF] transition-colors py-2 cursor-default select-none"
                  >
                    <span>{link.label}</span>
                    <ChevronDown
                      className="w-4 h-4 transition-transform duration-200 group-hover:rotate-180"
                      strokeWidth={2.25}
                    />
                  </span>
                  {/* Invisible bridge to avoid hover gap */}
                  <div className="absolute left-0 right-0 top-full h-3" />
                  <div className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+0.5rem)] w-max min-w-[240px] bg-white rounded-[10px] shadow-lg py-3 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200">
                    {link.subLinks.map((sub) =>
                      sub.disabled ? (
                        <span
                          key={sub.label}
                          className="flex items-center justify-between gap-4 px-5 py-2.5 text-base font-normal text-black/40 cursor-not-allowed select-none whitespace-nowrap"
                          aria-disabled="true"
                        >
                          <span>{sub.label}</span>
                          {sub.note && (
                            <span className="text-[11px] font-medium uppercase tracking-wide text-[#0066FF]/80 bg-[#0066FF]/10 rounded-full px-2 py-0.5 whitespace-nowrap">
                              {sub.note}
                            </span>
                          )}
                        </span>
                      ) : (
                        <a
                          key={sub.label}
                          href={sub.href}
                          className="block px-5 py-2.5 text-base font-normal text-black hover:text-[#0066FF] hover:bg-[#FAEBE1]/60 transition-colors"
                        >
                          {sub.label}
                        </a>
                      ),
                    )}
                  </div>
                </div>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  className="flex items-center gap-1 text-base font-normal text-black hover:text-[#0066FF] transition-colors"
                >
                  <span>{link.label}</span>
                </a>
              ),
            )}
            <a
              href={isLoggedIn ? "/mein-konto" : "/start"}
              className="text-sm font-semibold text-[#0066FF] border border-[#0066FF] hover:bg-[#0066FF]/10 rounded-[10px] px-5 py-2.5 transition-colors"
            >
              {isLoggedIn ? "Mein Konto" : "Login"}
            </a>
          </nav>

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden p-2 -mr-2 text-black"
            aria-label="Menü"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-black/5 bg-[#FAEBE1]">
          <nav className="max-w-7xl mx-auto px-5 py-4 flex flex-col gap-1">
            {NAV_LINKS.map((link) =>
              link.subLinks ? (
                <div key={link.label} className="border-b border-black/5">
                  <button
                    type="button"
                    onClick={() => toggleMobileSection(link.label)}
                    className="flex items-center justify-between w-full text-base font-medium text-black py-3"
                  >
                    <span>{link.label}</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        mobileExpanded === link.label ? "rotate-180" : ""
                      }`}
                      strokeWidth={2.25}
                    />
                  </button>
                  {mobileExpanded === link.label && (
                    <div className="pb-3 pl-4 flex flex-col gap-1">
                      {link.subLinks.map((sub) =>
                        sub.disabled ? (
                          <span
                            key={sub.label}
                            className="flex items-center justify-between gap-3 py-2 text-sm font-medium text-black/40 cursor-not-allowed select-none whitespace-nowrap"
                            aria-disabled="true"
                          >
                            <span className="truncate">{sub.label}</span>
                            {sub.note && (
                              <span className="text-[10px] font-medium uppercase tracking-wide text-[#0066FF]/80 bg-[#0066FF]/10 rounded-full px-2 py-0.5 whitespace-nowrap flex-shrink-0">
                                {sub.note}
                              </span>
                            )}
                          </span>
                        ) : (
                          <a
                            key={sub.label}
                            href={sub.href}
                            className="block py-2 text-sm font-medium text-black/80"
                            onClick={() => setMobileOpen(false)}
                          >
                            {sub.label}
                          </a>
                        ),
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  className="flex items-center justify-between text-base font-medium text-black py-3 border-b border-black/5"
                  onClick={() => setMobileOpen(false)}
                >
                  <span>{link.label}</span>
                </a>
              ),
            )}
            <a
              href={isLoggedIn ? "/mein-konto" : "/start"}
              className="mt-3 text-center text-base font-semibold text-[#0066FF] border border-[#0066FF] hover:bg-[#0066FF]/10 rounded-[10px] px-5 py-3 transition-colors"
            >
              {isLoggedIn ? "Mein Konto" : "Login"}
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
