// Lightweight in-process rate limiter for expensive endpoints (the
// Anthropic-backed AI routes). Keyed by an arbitrary string — pass the
// authenticated user id so a single account can't loop an endpoint into
// a large Anthropic bill. Supports several windows at once (e.g. a tight
// per-minute burst cap plus a looser per-hour cap).
//
// State lives in module memory, so the windows are per server instance.
// On a single Railway instance that covers the whole app; if the service
// is ever scaled horizontally each instance keeps its own counter. Treat
// this as defence-in-depth ON TOP OF the hard monthly spend limit
// configured in the Anthropic console, never as the sole guarantee.

export interface RateLimitRule {
  windowMs: number;
  max: number;
}

export interface RateLimitResult {
  ok: boolean;
  /** Seconds the caller should wait before retrying (0 when ok). */
  retryAfterSec: number;
}

// key → sorted list of hit timestamps (epoch ms) within the longest window.
const buckets = new Map<string, number[]>();

/**
 * Record a hit for `key` and report whether it stays within every rule.
 * When any rule is exceeded the hit is NOT recorded (so a caller hammering
 * a blocked endpoint doesn't push the reset time forward forever).
 */
export function checkRateLimit(
  key: string,
  rules: RateLimitRule[],
): RateLimitResult {
  const now = Date.now();
  const longest = Math.max(...rules.map((r) => r.windowMs));
  // Drop timestamps older than the longest window so memory stays bounded.
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < longest);

  for (const rule of rules) {
    const within = hits.filter((t) => now - t < rule.windowMs);
    if (within.length >= rule.max) {
      const oldest = within[0];
      const retryAfterSec = Math.max(
        1,
        Math.ceil((rule.windowMs - (now - oldest)) / 1000),
      );
      buckets.set(key, hits); // keep the pruned list, don't add this hit
      return { ok: false, retryAfterSec };
    }
  }

  hits.push(now);
  buckets.set(key, hits);
  return { ok: true, retryAfterSec: 0 };
}
