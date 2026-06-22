// Community-event pickup option for merch. During the event window the
// buyer can opt to pick up their merch at the EPHIA Community Event in
// Berlin instead of paying for shipping. The option (and the countdown
// banner) auto-disappears at the cutoff — after that, only Versand
// exists and the store reverts to its normal design.
//
// The client modal (checkout-launcher), the countdown banner
// (event-countdown) and the server route (api/merch-checkout) all import
// these constants so the eligibility + cutoff logic stays consistent
// between UI and server-side validation.

export const COMMUNITY_PICKUP_EVENT = {
  /** Human-readable date label for the modal copy. */
  dateLabel: "Montag, 22. Juni 2026",
  /** Human-readable time label for the event itself. */
  timeLabel: "19:30 Uhr",
  /** Address shown in the modal when pickup is selected. */
  location: "Galerie Robert Grunenberg, Kantstraße 147, Berlin",
  /**
   * Moment the pickup option disappears. We keep free event pickup open
   * for the whole event day and cut it off at midnight (Europe/Berlin).
   * Once the countdown hits zero the banner and the pickup option vanish
   * and the merch store reverts to shipping-only. CEST (Central European
   * Summer Time) is UTC+2 in late June, so midnight on 22 June is
   * 2026-06-23T00:00:00+02:00.
   */
  cutoffIso: "2026-06-23T00:00:00+02:00",
} as const;

/** Returns true when the pickup option / event banner should still show. */
export function isPickupOpen(now: Date = new Date()): boolean {
  return now.getTime() < new Date(COMMUNITY_PICKUP_EVENT.cutoffIso).getTime();
}

/**
 * Milliseconds remaining until the pickup cutoff. Clamped at 0 so callers
 * can render a 00:00:00 timer without going negative. Drives the
 * countdown banner.
 */
export function msUntilPickupCutoff(now: Date = new Date()): number {
  return Math.max(
    0,
    new Date(COMMUNITY_PICKUP_EVENT.cutoffIso).getTime() - now.getTime(),
  );
}

/**
 * Whether a product supports community-event pickup. For the event we
 * opened this up to ALL merch (originally it was the SONJA X EPHIA shirt
 * only) so any guest can buy anything at the table without paying
 * shipping. Eligibility only matters while isPickupOpen() is true; after
 * the midnight cutoff the pickup option disappears regardless of slug.
 */
export function isProductPickupEligible(
  slug: string | null | undefined,
): boolean {
  return !!slug;
}
