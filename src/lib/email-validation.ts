// Client-safe email sanity checks for the booking funnels. Two layers:
//
//   1. isLikelyValidEmail — a format regex that rejects the structurally
//      broken addresses (missing @, missing TLD, spaces, double dots).
//   2. suggestEmailCorrection — a typo detector for addresses that ARE
//      well-formed but almost certainly wrong (icloud.con, ucloud.com,
//      gmial.com, web.d …). It returns a suggested fix, never blocks.
//
// The motivation is concrete: probands book with a mistyped address, the
// booking succeeds, and every confirmation and reminder then bounces
// silently. One real case created three duplicate profiles for the same
// person (icloud.con / ucloud.com / icloud.com). A regex can't know the
// right TLD, but nearest-neighbour matching against the handful of
// providers our audience actually uses catches the common slips.
//
// Pure TypeScript, no server imports — safe to run in the browser.

// Structural format check. Deliberately permissive on the local part
// (RFC allows a lot) but strict about the shape that matters here: a
// single @, a dotted domain, a TLD of at least two letters, and no
// whitespace or doubled/edge dots in the domain.
export function isLikelyValidEmail(input: string): boolean {
  const email = input.trim();
  if (!email) return false;
  if (!/^[^\s@]+@[^\s@]+$/.test(email)) return false;

  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  if (!domain.includes(".")) return false;
  if (domain.startsWith(".") || domain.endsWith(".")) return false;
  if (domain.includes("..")) return false;

  const tld = domain.slice(domain.lastIndexOf(".") + 1);
  if (!/^[a-z]{2,}$/.test(tld)) return false;

  return true;
}

// Providers our audience (Ärzt:innen + Proband:innen, mostly DACH) uses.
// Suggestions are only offered towards these known-good domains, so we
// never "correct" a rare-but-real domain into a popular one.
const KNOWN_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "icloud.com",
  "me.com",
  "web.de",
  "gmx.de",
  "gmx.net",
  "t-online.de",
  "hotmail.com",
  "hotmail.de",
  "outlook.com",
  "outlook.de",
  "yahoo.com",
  "yahoo.de",
  "live.de",
  "live.com",
  "aol.com",
  "freenet.de",
  "mail.de",
  "posteo.de",
];

const KNOWN_TLDS = ["com", "de", "net", "org", "at", "ch", "eu", "info"];

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

// Nearest known value within `maxDistance`, or null. Distance 0 (exact
// match) also returns null — nothing to suggest when it's already right.
function nearest(value: string, candidates: string[], maxDistance: number): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  for (const cand of candidates) {
    if (cand === value) return null;
    const d = levenshtein(value, cand);
    if (d < bestDist) {
      bestDist = d;
      best = cand;
    }
  }
  return best !== null && bestDist <= maxDistance ? best : null;
}

// Returns a corrected address to suggest ("Meintest Du …?"), or null when
// the address is empty, structurally broken, or looks fine. Only the
// domain is ever rewritten; the local part is left untouched.
export function suggestEmailCorrection(input: string): string | null {
  const email = input.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!domain.includes(".")) return null;

  // Already a known-good domain: nothing to do.
  if (KNOWN_DOMAINS.includes(domain)) return null;

  // 1. Whole-domain typo (gmial.com, ucloud.com, hotmial.de …). One or
  //    two edits away from a provider we know. Distance 2 covers the
  //    common double-slip (icloud.con → two edits from icloud.com is 1,
  //    but ucloud.con would be 2) without matching unrelated domains.
  const domainFix = nearest(domain, KNOWN_DOMAINS, 2);
  if (domainFix) return `${local}@${domainFix}`;

  // 2. TLD-only typo on an otherwise-unknown domain (praxis-mueller.dee,
  //    firma.con). Keep the domain label, fix just the TLD.
  const lastDot = domain.lastIndexOf(".");
  const label = domain.slice(0, lastDot);
  const tld = domain.slice(lastDot + 1);
  const tldFix = nearest(tld, KNOWN_TLDS, 1);
  if (tldFix) return `${local}@${label}.${tldFix}`;

  return null;
}
