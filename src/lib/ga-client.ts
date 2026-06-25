// Browser-side helper to read the GA4 client_id and session_id out of the
// gtag.js runtime. These two IDs are what tie a server-side Measurement
// Protocol conversion (fired from the Stripe webhook) back to the user's
// original GA4 session, so the booking is credited to the organic-search
// visit instead of showing up as a fresh "direct" session.
//
// Returns empty when GA hasn't loaded (e.g. cookie consent was denied, or
// the NEXT_PUBLIC_GA4_MEASUREMENT_ID env var isn't set). Callers must treat
// the IDs as optional and simply skip conversion tracking when absent.

const GA_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

type Gtag = (...args: unknown[]) => void;

export async function getGa4Ids(
  timeoutMs = 800,
): Promise<{ clientId?: string; sessionId?: string }> {
  if (typeof window === "undefined" || !GA_ID) return {};

  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (typeof gtag !== "function") return {};

  // gtag('get', ...) resolves asynchronously via callback. Wrap each lookup
  // in a timeout so a missing/slow GA runtime can never stall the checkout.
  const get = (field: string) =>
    new Promise<string | undefined>((resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(undefined);
        }
      }, timeoutMs);
      try {
        gtag("get", GA_ID, field, (value: string) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve(value || undefined);
          }
        });
      } catch {
        clearTimeout(timer);
        resolve(undefined);
      }
    });

  const [clientId, sessionId] = await Promise.all([
    get("client_id"),
    get("session_id"),
  ]);
  return { clientId, sessionId };
}
