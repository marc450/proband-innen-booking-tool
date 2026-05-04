// Community-event pickup option for merch. The buyer can opt to pick
// up the t-shirt at the EPHIA Community Event in Berlin instead of
// paying for shipping. The option auto-disappears once the event has
// started — after that, only Versand exists.
//
// Both the client modal (checkout-launcher) and the server route
// (api/merch-checkout) import these constants so the eligibility +
// cutoff logic stays consistent between UI and server-side validation.

export const COMMUNITY_PICKUP_EVENT = {
  /** Human-readable date label for the modal copy. */
  dateLabel: "Montag, 22. Juni 2026",
  /** Human-readable time label. */
  timeLabel: "19:30 Uhr",
  /** Address shown in the modal when pickup is selected. */
  location: "Galerie Robert Grunenberg, Kantstraße 147, Berlin",
  /**
   * Moment the pickup option disappears. We use the event start time
   * in Europe/Berlin as the cutoff: once doors open, anyone who
   * hasn't already ordered has missed the chance to pick up there.
   * CEST (Central European Summer Time) is UTC+2 in late June.
   */
  cutoffIso: "2026-06-22T19:30:00+02:00",
} as const;

/**
 * Product slugs that are eligible for the community-event pickup.
 * The cap is intentionally NOT eligible — the option exists for the
 * SONJA X EPHIA t-shirt only (where Sonja Yakovleva will be present
 * at the event for handover).
 */
export const PICKUP_ELIGIBLE_PRODUCT_SLUGS: readonly string[] = [
  "sonja-x-ephia-shirt",
];

/** Returns true when the pickup option should still be offered. */
export function isPickupOpen(now: Date = new Date()): boolean {
  return now.getTime() < new Date(COMMUNITY_PICKUP_EVENT.cutoffIso).getTime();
}

/** Returns true when the given product slug supports community pickup. */
export function isProductPickupEligible(
  slug: string | null | undefined,
): boolean {
  return !!slug && PICKUP_ELIGIBLE_PRODUCT_SLUGS.includes(slug);
}
