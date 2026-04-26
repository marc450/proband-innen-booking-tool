"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

interface Props {
  label: string;
  /** Plain anchor fallback — used when no directCheckoutCourseKey is set. */
  href: string;
  /**
   * When set, clicking the CTA POSTs to /api/course-checkout for the
   * Onlinekurs of this courseKey and redirects to Stripe. Used for pure-
   * online courses that don't render the booking widget on the page.
   */
  directCheckoutCourseKey?: string;
  /** Optional price string shown after the label, e.g. "EUR 250". */
  priceSuffix?: string;
}

export function HeroCta({ label, href, directCheckoutCourseKey, priceSuffix }: Props) {
  const [loading, setLoading] = useState(false);

  // No direct checkout → render a normal anchor (SSR-friendly, no JS).
  if (!directCheckoutCourseKey) {
    return (
      <a
        href={href}
        className="inline-flex items-center gap-3 text-[1.1rem] font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-6 py-3.5 transition-colors"
      >
        <span>{label}</span>
        {priceSuffix && (
          <>
            <span className="h-5 w-px bg-white/40" aria-hidden="true" />
            <span className="font-semibold">{priceSuffix}</span>
          </>
        )}
      </a>
    );
  }

  const redirectTo = (url: string) => {
    try {
      if (window.top && window.top !== window) {
        window.top.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch {
      window.location.href = url;
    }
  };

  const onClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/course-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseKey: directCheckoutCourseKey,
          courseType: "Onlinekurs",
          sessionId: null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        alert(data.error || "Fehler beim Starten des Checkouts.");
        setLoading(false);
        return;
      }
      redirectTo(data.url);
    } catch {
      alert("Unerwarteter Fehler beim Starten des Checkouts.");
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="relative inline-flex items-center gap-3 text-[1.1rem] font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-6 py-3.5 transition-colors disabled:opacity-70 disabled:cursor-wait"
    >
      {/* Idle content stays in flow even while loading so the button
          width doesn't collapse. The loader overlays it absolutely. */}
      <span
        className={`inline-flex items-center gap-3 ${loading ? "invisible" : ""}`}
      >
        <span>{label}</span>
        {priceSuffix && (
          <>
            <span className="h-5 w-px bg-white/40" aria-hidden="true" />
            <span className="font-semibold">{priceSuffix}</span>
          </>
        )}
      </span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
          <span>Wird geladen...</span>
        </span>
      )}
    </button>
  );
}
