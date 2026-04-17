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
        className="inline-block text-[1.1rem] font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-6 py-3.5 transition-colors text-center sm:text-left"
      >
        {label}
        {priceSuffix && <span className="ml-2 opacity-80 font-semibold">— {priceSuffix}</span>}
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
      className="inline-flex items-center gap-2 text-[1.1rem] font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-6 py-3.5 transition-colors text-center sm:text-left disabled:opacity-70 disabled:cursor-wait"
    >
      {loading && <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />}
      {loading ? (
        "Wird geladen..."
      ) : (
        <>
          {label}
          {priceSuffix && <span className="ml-2 opacity-80 font-semibold">— {priceSuffix}</span>}
        </>
      )}
    </button>
  );
}
