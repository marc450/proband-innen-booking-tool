"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

// Simple two-button cookie banner: "Alle akzeptieren" or "Ablehnen".
// No granular categories per product decision — today there are zero
// non-essential cookies in the codebase, so the banner is mainly here
// to honour the disclosure requirement and to be ready when GA / Meta
// Pixel / similar get added later.
//
// Future tracking scripts should gate on `getCookieConsent()` so they
// only fire once the user has accepted. localStorage is enough for a
// pure client-side gate; mirror to a cookie if we ever need
// server-side conditional rendering of tracking <Script> tags.

const STORAGE_KEY = "ephia_cookie_consent_v1";
type Consent = "accepted" | "denied";

// Routes where the banner must NOT appear: admin areas, the OAuth
// login page, the LearnWorlds-embedded course iframes (LW shows its
// own consent UI inside the iframe and we don't want a double layer),
// and any API surface (no UI to begin with).
const HIDDEN_PREFIXES = ["/dashboard", "/m", "/login", "/courses", "/api"];

export function getCookieConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "accepted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function CookieConsent() {
  const pathname = usePathname() ?? "";
  // Default to "decided" so the banner doesn't flash on routes where
  // we'd hide it anyway, and so SSR / first paint render nothing. The
  // useEffect below flips it on if storage is empty AND the path is
  // banner-eligible.
  const [decided, setDecided] = useState(true);

  useEffect(() => {
    if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) {
      setDecided(true);
      return;
    }
    setDecided(getCookieConsent() !== null);
  }, [pathname]);

  const decide = (decision: Consent) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, decision);
    } catch {
      /* localStorage unavailable (Safari private mode etc.) — banner
         will reappear next visit, which is acceptable. */
    }
    setDecided(true);
  };

  if (decided) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie-Hinweis"
      className="fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:max-w-md z-50"
    >
      <div className="bg-white rounded-[10px] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.12),0_2px_6px_-2px_rgba(0,0,0,0.08)] p-5">
        <p className="text-sm text-black/80 leading-relaxed">
          Wir setzen Cookies ein, damit unsere Website zuverlässig funktioniert und wir verstehen, wie Du sie nutzt. Du kannst alle akzeptieren oder ablehnen. Details findest Du in unserer{" "}
          <Link
            href="/kurse/datenschutz"
            className="text-[#0066FF] underline"
          >
            Datenschutzerklärung
          </Link>
          .
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            type="button"
            onClick={() => decide("denied")}
            className="flex-1 min-w-[120px] text-sm font-medium bg-black/[0.04] hover:bg-black/[0.08] rounded-[10px] px-4 py-2.5 transition-colors"
          >
            Ablehnen
          </button>
          <button
            type="button"
            onClick={() => decide("accepted")}
            className="flex-1 min-w-[120px] text-sm font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-4 py-2.5 transition-colors"
          >
            Alle akzeptieren
          </button>
        </div>
      </div>
    </div>
  );
}
