"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

interface Props {
  label: string;
  href: string;
  directCheckoutCourseKey?: string;
  /** Optional price string shown after the label, e.g. "EUR 250". */
  priceSuffix?: string;
}

/**
 * Client-side CTA button used inside the mid-page CTA banner. Matches
 * the behaviour of HeroCta: either renders a plain anchor or POSTs to
 * /api/course-checkout and redirects to Stripe for courses that don't
 * render a booking widget.
 */
export function CtaBannerButton({
  label,
  href,
  directCheckoutCourseKey,
  priceSuffix,
}: Props) {
  const [loading, setLoading] = useState(false);

  if (!directCheckoutCourseKey) {
    return (
      <a
        href={href}
        className="inline-flex items-center gap-3 text-[1.1rem] font-bold text-[#0066FF] bg-white hover:bg-white/90 rounded-[10px] px-6 py-3.5 transition-colors"
      >
        <span>{label}</span>
        {priceSuffix && (
          <>
            <span className="h-5 w-px bg-[#0066FF]/30" aria-hidden="true" />
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
      className="relative inline-flex items-center gap-3 text-[1.1rem] font-bold text-[#0066FF] bg-white hover:bg-white/90 rounded-[10px] px-6 py-3.5 transition-colors disabled:opacity-70 disabled:cursor-wait"
    >
      {/* Idle content stays in flow even while loading so the button
          width doesn't collapse. The loader overlays it absolutely. */}
      <span
        className={`inline-flex items-center gap-3 ${loading ? "invisible" : ""}`}
      >
        <span>{label}</span>
        {priceSuffix && (
          <>
            <span className="h-5 w-px bg-[#0066FF]/30" aria-hidden="true" />
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
