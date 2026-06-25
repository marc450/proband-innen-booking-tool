// Hygiene check for user-entered image URLs (e.g. merch product images
// typed by staff). These end up in <img src> / next/image, which already
// run SVGs in script-safe mode, so this is defence-in-depth rather than a
// fix for a live XSS hole: it blocks junk and stops a stored value from
// becoming a vector if it's ever rendered somewhere less safe (an <a href>
// or dangerouslySetInnerHTML).
//
// Accepts: empty string (callers treat empty as "no image"), root-relative
// same-origin paths ("/foo.png"), and absolute http(s) URLs. Rejects
// everything else, notably javascript:, data: and other schemes.
export function isSafeImageUrl(value: string | null | undefined): boolean {
  const v = (value ?? "").trim();
  if (!v) return true;
  // Root-relative, same-origin. Exclude protocol-relative ("//host").
  if (v.startsWith("/") && !v.startsWith("//")) return true;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
