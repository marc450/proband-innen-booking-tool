/**
 * Normalise an email address for use as a stable lookup key.
 *
 * Gmail treats these as equivalent (they all deliver to the same mailbox):
 *   - "Foo.Bar@gmail.com"
 *   - "foo.bar@gmail.com"
 *   - "foobar@gmail.com"
 *   - "foo.bar@googlemail.com"
 *
 * Our `auszubildende` table has a unique index on `email`, so two spellings
 * of the same Gmail address create two rows and break the "returning
 * customer" detection in the Stripe webhook (customer ends up filling the
 * profile form twice).
 *
 * Rules:
 *   1. Trim + lowercase the address.
 *   2. Rewrite `@googlemail.com` → `@gmail.com` (Gmail aliases them globally).
 *   3. Strip dots from the local part for gmail.com addresses only.
 *      Do NOT strip for other providers (iCloud/Outlook keep dots meaningful).
 *   4. Drop the `+tag` suffix for gmail.com only. (iCloud also supports this
 *      but it's safer to be conservative for non-Google providers.)
 *
 * Non-email inputs are returned empty so callers can fall back safely.
 */
export function normalizeEmail(input: string | null | undefined): string {
  if (!input) return "";
  const trimmed = input.trim().toLowerCase();
  if (!trimmed.includes("@")) return trimmed;

  const atIdx = trimmed.lastIndexOf("@");
  let local = trimmed.slice(0, atIdx);
  let domain = trimmed.slice(atIdx + 1);

  // googlemail.com is an alias of gmail.com
  if (domain === "googlemail.com") {
    domain = "gmail.com";
  }

  if (domain === "gmail.com") {
    // Drop "+tag" suffix
    const plusIdx = local.indexOf("+");
    if (plusIdx !== -1) local = local.slice(0, plusIdx);
    // Remove dots from the local part only (Gmail ignores them). The
    // split above separates the domain, so dots in "gmail.com" are
    // preserved automatically.
    local = local.replaceAll(".", "");
  }

  return `${local}@${domain}`;
}
