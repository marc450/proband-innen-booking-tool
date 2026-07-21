"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/ga-client";

/**
 * Course-bridge CTAs for the Dozent:innen profile pages.
 *
 * Context: these bio pages pull strong organic traffic (people who saw a
 * Dozentin in the media) but converted at ~0%, because the only course
 * link sat at the very bottom while the outbound "Im Netz" profile links
 * sat near the top. These components add course entry points *above* the
 * outbound links and keep one permanently in view.
 *
 * Every CTA here carries a `data-cta` marker and fires a `bio_cta_click`
 * GA4 event with a `location` param, so clicks can be attributed to the
 * specific placement that earned them. These are now the only course
 * links on the page — the old untagged block at the very bottom was
 * removed once these were live.
 */

/** Marker values — also used as the GA4 `location` event param. */
export type BioCtaLocation =
  | "bio-bridge-top"
  | "bio-bridge-mid"
  | "bio-bridge-sticky";

/**
 * Id on the top CTA. The sticky bar observes this element and only shows
 * itself once the top CTA has scrolled out of view, so the two never
 * compete for attention.
 */
export const TOP_CTA_ANCHOR_ID = "bio-bridge-anchor";

/** Shared button styling, carried over from the removed bottom CTA so the
 *  profile pages keep the same button look as the rest of /kurse. */
const BUTTON_CLASSES =
  "inline-flex items-center justify-center rounded-[10px] bg-[#FAEBE1] text-[#0066FF] font-bold text-base md:text-lg px-7 py-4 hover:bg-white transition-colors";

const BUTTON_LABEL = "Alle Kurse ansehen";

function handleClick(location: BioCtaLocation, personSlug: string) {
  trackEvent("bio_cta_click", { location, person: personSlug });
}

/**
 * Inline course bridge. Rendered twice: once directly under the intro /
 * bio (before any outbound link) and once after "Podcasts & Interviews".
 */
export function BioCourseCta({
  href,
  intro,
  location,
  personSlug,
  className = "",
}: {
  href: string;
  /** German lead-in, e.g. "Sophia unterrichtet bei EPHIA. …". */
  intro: string;
  location: Extract<BioCtaLocation, "bio-bridge-top" | "bio-bridge-mid">;
  personSlug: string;
  className?: string;
}) {
  return (
    <div
      id={location === "bio-bridge-top" ? TOP_CTA_ANCHOR_ID : undefined}
      className={`bg-[#0066FF] rounded-[10px] p-6 md:p-8 flex flex-col items-start gap-4 ${className}`}
    >
      <p className="text-base md:text-lg font-semibold text-white leading-relaxed">
        {intro}
      </p>
      <Link
        href={href}
        data-cta={location}
        onClick={() => handleClick(location, personSlug)}
        className={BUTTON_CLASSES}
      >
        {BUTTON_LABEL}
      </Link>
    </div>
  );
}

/**
 * Slim sticky course bar.
 *
 * Anchored to the *bottom* on purpose: the marketing Header is already
 * `sticky top-0 z-40`, so a top bar would collide with it. It sits at
 * z-30 so it stays under both the header and the cookie banner (z-50).
 *
 * Visibility is driven by an IntersectionObserver on the top CTA rather
 * than a scroll-offset threshold: the bar appears exactly when the top
 * CTA leaves the viewport. That keeps the two from competing on first
 * paint, and it degrades correctly on the short Review-Board profiles
 * (no media, no curriculum) where a fixed pixel threshold would either
 * never trigger or trigger with nothing left to scroll.
 *
 * The fixed bar would overlay page content, so the page renders a spacer
 * of matching height at the end of <main> instead of the bar covering the
 * footer.
 */
export function StickyCourseBar({
  href,
  label,
  personSlug,
}: {
  href: string;
  /** Short context line, hidden on small screens where space is tight. */
  label: string;
  personSlug: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // The top CTA is rendered unconditionally by every profile page, so
    // the anchor is always present; the guard is pure defensiveness.
    const anchor = document.getElementById(TOP_CTA_ANCHOR_ID);
    if (!anchor) return;

    // observe() always delivers an initial callback with the element's
    // current intersection state, so this sets the correct value on the
    // first paint after hydration without seeding it separately.
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(anchor);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-30 bg-[#0066FF] shadow-[0_-4px_16px_rgba(0,0,0,0.12)] transition-transform duration-300 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-4xl mx-auto px-5 md:px-8">
        <div className="flex items-center justify-between gap-4 py-3">
          {/* Context line is desktop-only: on mobile the bar stays a
              single centred button so it can be as slim as possible. */}
          <p className="hidden sm:block min-w-0 text-sm md:text-base font-semibold text-white truncate">
            {label}
          </p>
          <Link
            href={href}
            data-cta="bio-bridge-sticky"
            tabIndex={visible ? undefined : -1}
            onClick={() => handleClick("bio-bridge-sticky", personSlug)}
            className="inline-flex flex-1 sm:flex-none items-center justify-center rounded-[10px] bg-[#FAEBE1] text-[#0066FF] font-bold text-sm md:text-base px-5 py-2.5 hover:bg-white transition-colors"
          >
            {BUTTON_LABEL}
          </Link>
        </div>
      </div>
    </div>
  );
}
