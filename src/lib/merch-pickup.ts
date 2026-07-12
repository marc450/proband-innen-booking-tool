// Pickup option for merch. Instead of paying for shipping, the buyer can
// choose "Abholung im Kurs": they pick their order up at their next EPHIA
// course on location. Choosing pickup waives the shipping fee entirely
// (the checkout skips Stripe's shipping_options + shipping_address_collection
// and the order records shipping_gross_cents = 0 with pickup_at_event = true).
//
// This replaces the earlier time-limited "Abholung beim Community Event".
// Unlike that event window, course pickup is always available and not tied
// to a date, so there is no cutoff and no countdown.
//
// The client modal (checkout-launcher) and the server route
// (api/merch-checkout) both import these so the copy + eligibility logic
// stay consistent between UI and server-side validation.

export const COURSE_PICKUP = {
  /** Label for the pickup choice button. */
  label: "Abholung im Kurs",
} as const;

/**
 * Whether the pickup option is currently offered. Course pickup is always
 * available, so this is unconditionally true. Kept as a function (rather
 * than inlining `true`) so the checkout route and modal keep a single
 * shared entry point for the eligibility gate, ready to re-gate later if
 * pickup ever needs to be paused.
 */
export function isPickupOpen(): boolean {
  return true;
}

/**
 * Whether a product supports course pickup. Offered on every merch product,
 * so this is true for any real slug.
 */
export function isProductPickupEligible(
  slug: string | null | undefined,
): boolean {
  return !!slug;
}
