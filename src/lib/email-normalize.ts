/**
 * Normalise an email address for use as a stable lookup key.
 *
 * Our `auszubildende` table has a unique index on `email`, so variant
 * spellings of the same mailbox create two rows and break the
 * "returning customer" detection in the Stripe webhook (customer ends
 * up filling the profile form twice). The concrete case that motivated
 * this helper: Google owns both `gmail.com` and `googlemail.com` and
 * routes them to the same mailbox, but our DB treated a customer who
 * booked once with each form as two separate people.
 *
 * Rules:
 *   1. Trim + lowercase the whole address. RFC 5321 defines the local
 *      part as case-sensitive in theory, but in practice every mail
 *      provider in use today treats it case-insensitively, so this is
 *      safe and catches "Foo@bar.com" vs "foo@bar.com" duplicates.
 *   2. Rewrite `@googlemail.com` → `@gmail.com`. Google aliases these
 *      domains globally.
 *
 * We deliberately do NOT strip dots or "+tag" suffixes from Gmail local
 * parts. Gmail ignores both when delivering, but the user's display
 * form is theirs and we want to preserve it for invoices, support
 * lookups, and LearnWorlds account matching. Real-world duplicate
 * bookings from the same person with different dot patterns are
 * vanishingly rare, so the tradeoff wasn't worth it.
 *
 * Non-email inputs are returned as-is (trimmed + lowercased).
 */
export function normalizeEmail(input: string | null | undefined): string {
  if (!input) return "";
  const trimmed = input.trim().toLowerCase();
  if (!trimmed.includes("@")) return trimmed;

  const atIdx = trimmed.lastIndexOf("@");
  const local = trimmed.slice(0, atIdx);
  let domain = trimmed.slice(atIdx + 1);

  // googlemail.com is an alias of gmail.com (same mailbox, same password)
  if (domain === "googlemail.com") {
    domain = "gmail.com";
  }

  return `${local}@${domain}`;
}
