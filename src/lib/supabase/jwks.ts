// Process-wide JWKS cache for local access-token verification.
//
// supabase.auth.getClaims() verifies the access token's ES256 signature
// against our project's public key, which means no round trip to the Auth
// server. But auth-js caches the key set on the *client instance*, and both
// the middleware and the server components build a fresh client per request.
// Left alone, that turns every single request into a JWKS fetch.
//
// getClaims({ jwks }) short-circuits that: auth-js checks the supplied key
// set first and only falls back to its own fetch when the token's kid isn't
// in it. Caching here, at module scope, means the common path does zero
// network I/O and key rotation still self-heals (an unknown kid misses our
// cache, auth-js fetches once, and the next refresh picks the new key up).

import type { JWK } from "@supabase/auth-js";

// Matches auth-js's own JWKS_TTL. Short enough that a rotated key is picked
// up promptly, long enough that the fetch is amortised to nothing.
const TTL_MS = 10 * 60 * 1000;

let cached: { keys: JWK[] } | null = null;
let cachedAt = 0;
// Dedupes the fetch when several requests race on a cold cache.
let inflight: Promise<{ keys: JWK[] } | null> | null = null;

async function fetchJwks(): Promise<{ keys: JWK[] } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  try {
    const res = await fetch(`${url}/auth/v1/.well-known/jwks.json`, {
      headers: { apikey: anonKey },
      // Next would otherwise cache this fetch as part of a route's data cache.
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { keys?: JWK[] };
    if (!body.keys?.length) return null;
    return { keys: body.keys };
  } catch {
    // Network hiccup or timeout. Returning null just means getClaims falls
    // back to its own fetch (and then to getUser) for this request, which is
    // slower but still correct — never a failed auth check.
    return null;
  }
}

// Returns the cached key set, refreshing past the TTL. Returns null when the
// key set can't be resolved; callers pass that straight to getClaims, which
// then verifies via its own fetch or getUser() instead.
export async function getJwks(): Promise<{ keys: JWK[] } | null> {
  const now = Date.now();
  if (cached && cachedAt + TTL_MS > now) return cached;
  if (inflight) return inflight;

  inflight = fetchJwks()
    .then((result) => {
      if (result) {
        cached = result;
        cachedAt = Date.now();
      }
      // Serve a stale key set rather than nothing if the refresh failed —
      // the keys are long-lived, so stale beats a per-request round trip.
      return result ?? cached;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
