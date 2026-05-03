// Thin wrapper around the LearnWorlds v2 REST API. We use this as the
// glue layer in Model B (LW remains the canonical store of enrollment
// + runtime state, our app drives admin actions through it).
//
// Auth: every request needs both an access token and a client id.
// LW returns 401 if either is missing. Tokens come from the Railway
// env (LEARNWORLDS_*).
//
// All public functions throw on non-2xx so callers can wrap them in
// try/catch with confidence. The error message includes the response
// body (truncated) which is invaluable for debugging — LW's 400s
// usually carry a `message` field that explains the schema problem.
//
// ── Hard policy: destructive LW calls are heavily constrained ──────
//
// 1. NEVER delete course content. LW courses, products, units,
//    sections, lessons and certificates are the content library.
//    Losing one means rebuilding curriculum work that took years and
//    breaking access for every customer enrolled in it. There is zero
//    legitimate use case for firing such a DELETE from this app.
//    Refused by `refuseIfContentDelete`.
//
// 2. NEVER touch more than one user's enrollments at a time. Even
//    individually-correct unenrolls become a disaster if a buggy loop
//    or careless bulk-cancel feature applies them to many customers
//    in a row. We enforce two layers:
//      a) Path-shape: every destructive call must target the single-
//         user scope /v2/users/{id}/... — bulk-shaped paths are
//         refused. (`refuseIfNotSingleUserScope`)
//      b) Rate gate: at most one destructive call per 60-second
//         window per Node process. A second one trips the gate, even
//         on a different user. (`recordDestructiveOrRefuse`)
//
// Effect: legitimate one-off admin actions (cancel a single booking,
// merge two specific users) work. Anything that looks like a bulk
// operation fails closed before the network request leaves this
// process. Real bulk operations belong in the LW admin UI, not here.
//
// Extend the deny lists if LW ships new content-shaped resources or
// new bulk-shaped paths. Never remove from them.

const RAW_API_URL = process.env.LEARNWORLDS_API_URL;
const ACCESS_TOKEN = process.env.LEARNWORLDS_ACCESS_TOKEN;
const CLIENT_ID = process.env.LEARNWORLDS_CLIENT_ID;

function requireEnv(): { apiUrl: string; token: string; clientId: string } {
  if (!RAW_API_URL || !ACCESS_TOKEN || !CLIENT_ID) {
    throw new Error(
      "LearnWorlds API credentials missing. Set LEARNWORLDS_API_URL, " +
        "LEARNWORLDS_ACCESS_TOKEN and LEARNWORLDS_CLIENT_ID in env.",
    );
  }
  return {
    apiUrl: RAW_API_URL.replace(/\/$/, ""),
    token: ACCESS_TOKEN,
    clientId: CLIENT_ID,
  };
}

function lwHeaders(): Record<string, string> {
  const { token, clientId } = requireEnv();
  return {
    Authorization: `Bearer ${token}`,
    "Lw-Client": clientId,
    Accept: "application/json",
  };
}

interface LwFetchOptions extends RequestInit {
  // Skip throw-on-non-2xx for endpoints where we want to handle 404
  // ("user has no progress for this course yet") manually.
  allow404?: boolean;
}

// Top-level path segments that hold course content (the catalog).
// Any destructive method on a path starting with /v2/<segment>/...
// is refused at the wrapper level — see policy comment at the top.
//
// USER-scoped subpaths under these (e.g. /v2/users/{id}/courses) are
// fine and don't match this list because they live under /v2/users.
const CONTENT_DELETE_DENYLIST = [
  "courses",
  "products",
  "units",
  "sections",
  "lessons",
  "certificates",
  "bundles",
  "categories",
];

const DESTRUCTIVE_METHODS = new Set(["DELETE"]);

// Window in which a single Node process is allowed at most ONE
// destructive LW call. Crossing this boundary means a bulk-revoke
// pattern is forming and we refuse the second call. 60 seconds is long
// enough that a buggy loop will trip well within its first few
// iterations, short enough that a legitimately-spaced second admin
// action (e.g. revoke at 12:00, then a different one at 12:05) goes
// through.
const DESTRUCTIVE_WINDOW_MS = 60_000;

// Module-scoped log of recent destructive call timestamps. Prunes on
// every check. Process-local: if we ever scale to multiple Railway
// replicas, each replica gets its own counter, which still bounds the
// damage but doesn't enforce the rule globally. For real bulk
// operations the right answer is the LW admin UI, not relaxing this.
const recentDestructiveCalls: number[] = [];

function refuseIfContentDelete(method: string, path: string): void {
  if (!DESTRUCTIVE_METHODS.has(method.toUpperCase())) return;
  // Strip leading slashes + version prefix so we can match cleanly.
  const cleaned = path.replace(/^\/+/, "").replace(/^v\d+\//, "");
  const firstSeg = cleaned.split(/[/?]/)[0]?.toLowerCase() ?? "";
  if (CONTENT_DELETE_DENYLIST.includes(firstSeg)) {
    throw new Error(
      `LearnWorlds: refusing ${method} ${path}. Course-catalog ` +
        `deletion is hard-blocked by policy (see lib/learnworlds.ts ` +
        `header comment). If you genuinely need this, do it through ` +
        `the LW admin UI manually, not through this wrapper.`,
    );
  }
}

// Every destructive call must target exactly one user. The path shape
// /v2/users/{id}/... is allowed; anything else (no user scope, a bulk
// path, or a path explicitly named "bulk") is refused.
function refuseIfNotSingleUserScope(method: string, path: string): void {
  if (!DESTRUCTIVE_METHODS.has(method.toUpperCase())) return;
  const cleaned = path.replace(/^\/+/, "").replace(/^v\d+\//, "");
  const segments = cleaned.split(/[/?]/).filter((s) => s.length > 0);
  // Must start with users/{id}/...
  if (segments[0]?.toLowerCase() !== "users" || !segments[1]) {
    throw new Error(
      `LearnWorlds: refusing ${method} ${path}. Destructive calls must ` +
        `target exactly one user under /v2/users/{id}/... — a path ` +
        `without a single-user scope is treated as a bulk operation ` +
        `and blocked.`,
    );
  }
  // The {id} segment can't be a bulk-shaped placeholder.
  const userId = segments[1].toLowerCase();
  if (userId.includes(",") || userId.includes(":") || userId === "bulk") {
    throw new Error(
      `LearnWorlds: refusing ${method} ${path}. The user-id segment ` +
        `looks like a bulk identifier (commas, colons, or the literal ` +
        `"bulk"). Bulk revocations are blocked by policy.`,
    );
  }
  // Defensive: reject any segment named "bulk" anywhere in the path,
  // even on a single-user scope. LW shouldn't expose such an endpoint
  // today but if a future API gains /v2/users/{id}/bulk_unenroll we
  // want this to fail closed.
  for (const seg of segments) {
    if (seg.toLowerCase().startsWith("bulk")) {
      throw new Error(
        `LearnWorlds: refusing ${method} ${path}. Path segment "${seg}" ` +
          `flags a bulk-shaped operation. Blocked.`,
      );
    }
  }
}

// Enforces the per-process "at most one destructive call per 60s"
// rule. Call BEFORE issuing the request so a second concurrent attempt
// trips on the timestamp written by the first.
function recordDestructiveOrRefuse(method: string, path: string): void {
  if (!DESTRUCTIVE_METHODS.has(method.toUpperCase())) return;
  const now = Date.now();
  // Prune.
  while (
    recentDestructiveCalls.length > 0 &&
    now - recentDestructiveCalls[0] > DESTRUCTIVE_WINDOW_MS
  ) {
    recentDestructiveCalls.shift();
  }
  if (recentDestructiveCalls.length >= 1) {
    const ageSec = Math.round((now - recentDestructiveCalls[0]) / 1000);
    throw new Error(
      `LearnWorlds: refusing ${method} ${path}. A destructive LW call ` +
        `was already issued ${ageSec}s ago in this process. The wrapper ` +
        `enforces at most one such call per 60s window to prevent any ` +
        `bulk-revocation pattern from accidentally forming. Either wait, ` +
        `or perform the operation in the LW admin UI directly.`,
    );
  }
  recentDestructiveCalls.push(now);
}

async function lwFetch<T>(path: string, init: LwFetchOptions = {}): Promise<T | null> {
  const { apiUrl } = requireEnv();
  const { allow404, ...fetchInit } = init;
  const method = (fetchInit.method ?? "GET").toUpperCase();
  refuseIfContentDelete(method, path);
  refuseIfNotSingleUserScope(method, path);
  recordDestructiveOrRefuse(method, path);
  const url = `${apiUrl}${path}`;
  const res = await fetch(url, {
    ...fetchInit,
    headers: {
      ...lwHeaders(),
      ...(fetchInit.headers as Record<string, string> | undefined),
    },
    // Hard timeout so a slow LW response doesn't stall the whole
    // /mein-konto SSR. 8s is generous for a single REST call.
    signal: fetchInit.signal ?? AbortSignal.timeout(8000),
  });
  if (allow404 && res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `LW ${res.status} ${res.statusText} on ${path}: ${body.slice(0, 300)}`,
    );
  }
  if (res.status === 204) return null;
  return (await res.json()) as T;
}

// Raw GET-only probe for the admin debug endpoint. Returns whatever
// LW returns (parsed JSON), no type coercion, no schema assumptions.
// Restricted to GET so the destructive-call guards never trigger from
// debug code paths. Don't use this in production — it's for the
// /api/admin/debug-lw-courses diagnostic only.
export async function lwFetchRaw(path: string): Promise<unknown> {
  return lwFetch<unknown>(path);
}

// ── User lookup ──────────────────────────────────────────────────────

export interface LwUser {
  id: string;
  email: string;
  username?: string;
  fields?: Record<string, unknown>;
}

// Search LW users by email. LW's user search uses the `email` query
// param and returns a paginated `data` array. Returns null when no
// user matches.
export async function findUserByEmail(email: string): Promise<LwUser | null> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return null;
  const result = await lwFetch<{ data?: LwUser[] }>(
    `/v2/users?email=${encodeURIComponent(trimmed)}`,
  );
  return result?.data?.[0] ?? null;
}

// ── User courses + progress ──────────────────────────────────────────

// LW returns enrolled courses at /v2/users/{id}/courses with course
// metadata (title, image, description) but NO progress fields. We
// don't currently need that endpoint — our DB already carries every
// course's display data via course_templates — so we omit the helper.
// If a future feature wants the LW-side metadata it can pull it back
// in.

// LW progress response shape, observed empirically against marc's
// account on 2026-05-03. Only the fields we actually consume are
// typed. progress_per_section_unit is the verbose unit-by-unit tree
// we ignore for the progress bar.
export interface LwUserProgress {
  course_id: string;
  status?: string;
  progress_rate?: number | string;
  average_score_rate?: number | string;
  time_on_course?: number | string;
  total_units?: number;
  completed_units?: number;
  completed_at?: number | null;
}

// Fetch progress for every course the user has touched. Returns []
// when the user has no LW account or has never opened a course.
// One API call per /mein-konto load.
export async function listUserProgress(
  lwUserId: string,
): Promise<LwUserProgress[]> {
  if (!lwUserId) return [];
  const result = await lwFetch<{ data?: LwUserProgress[] }>(
    `/v2/users/${encodeURIComponent(lwUserId)}/progress`,
    { allow404: true },
  );
  return result?.data ?? [];
}

// Build a quick lookup of course_id → progress percent from a user
// progress response. Centralises the type coercion (LW occasionally
// serialises numbers as strings).
export function buildProgressMap(
  rows: LwUserProgress[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (!r.course_id) continue;
    const raw = r.progress_rate;
    const pct =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? Number(raw)
          : NaN;
    if (!Number.isFinite(pct)) continue;
    // Clamp to [0, 100] — LW occasionally returns 100.0001 from
    // floating-point aggregation.
    map.set(r.course_id, Math.max(0, Math.min(100, pct)));
  }
  return map;
}

// ── OAuth2 client_credentials access token (for SSO) ─────────────────
//
// The static LEARNWORLDS_ACCESS_TOKEN above is fine for cron-style v2
// calls (we tolerate occasional 401s and re-paste a fresh token), but
// SSO is user-triggered: a stale token would break login mid-flow.
// LW's OAuth2 client_credentials grant returns a token with
// expires_in≈8000s. We cache in module memory and refresh ~5min before
// expiry. A single in-flight refresh is shared via a promise so that
// concurrent SSO requests don't all hit the token endpoint at once.
//
// Falls back to LEARNWORLDS_ACCESS_TOKEN if LEARNWORLDS_CLIENT_SECRET
// isn't set, so the existing v2 path keeps working unchanged.

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedAccessToken: CachedToken | null = null;
let inFlightRefresh: Promise<string> | null = null;

const TOKEN_REFRESH_MARGIN_MS = 5 * 60_000;

async function fetchAccessTokenViaClientCredentials(): Promise<CachedToken> {
  const apiUrl = (RAW_API_URL ?? "").replace(/\/$/, "");
  const clientId = process.env.LEARNWORLDS_CLIENT_ID;
  const clientSecret = process.env.LEARNWORLDS_CLIENT_SECRET;
  if (!apiUrl || !clientId || !clientSecret) {
    throw new Error(
      "LW OAuth2 client_credentials missing: need LEARNWORLDS_API_URL, " +
        "LEARNWORLDS_CLIENT_ID, LEARNWORLDS_CLIENT_SECRET.",
    );
  }
  // LW's quirk: body is form-urlencoded with a single field named
  // `data` whose value is a JSON string. Same shape as the SSO POST.
  const body = new URLSearchParams();
  body.set(
    "data",
    JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  );
  const res = await fetch(`${apiUrl}/oauth2/access_token`, {
    method: "POST",
    headers: {
      "Lw-Client": clientId,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(
      `LW oauth2 ${res.status} ${res.statusText}: ${errBody.slice(0, 300)}`,
    );
  }
  const json = (await res.json()) as {
    success?: boolean;
    tokenData?: { access_token?: string; expires_in?: number };
    errors?: unknown;
  };
  const token = json.tokenData?.access_token;
  const expiresIn = json.tokenData?.expires_in;
  if (!token || typeof expiresIn !== "number") {
    throw new Error(
      `LW oauth2 response missing tokenData: ${JSON.stringify(json).slice(0, 300)}`,
    );
  }
  return {
    token,
    expiresAt: Date.now() + expiresIn * 1000,
  };
}

export async function getAccessToken(): Promise<string> {
  // No client_secret → fall back to the long-lived static token used
  // by the rest of this module. Lets the v2 wrapper keep working while
  // we roll out OAuth2 just for SSO.
  if (!process.env.LEARNWORLDS_CLIENT_SECRET) {
    const staticToken = process.env.LEARNWORLDS_ACCESS_TOKEN;
    if (!staticToken) {
      throw new Error(
        "LW access token missing: set either LEARNWORLDS_CLIENT_SECRET " +
          "(for OAuth2 grant) or LEARNWORLDS_ACCESS_TOKEN (static fallback).",
      );
    }
    return staticToken;
  }
  if (
    cachedAccessToken &&
    cachedAccessToken.expiresAt - Date.now() > TOKEN_REFRESH_MARGIN_MS
  ) {
    return cachedAccessToken.token;
  }
  if (inFlightRefresh) return inFlightRefresh;
  inFlightRefresh = fetchAccessTokenViaClientCredentials()
    .then((fresh) => {
      cachedAccessToken = fresh;
      return fresh.token;
    })
    .finally(() => {
      inFlightRefresh = null;
    });
  return inFlightRefresh;
}

// ── SSO login ────────────────────────────────────────────────────────
//
// POST /admin/api/sso with either an email (creates user if new) or an
// existing user_id (no creation, no profile overwrite). Returns a
// short-lived signed URL that logs the user into LW and lands them at
// `redirectUrl`. We hand that URL back to the caller, which does an
// HTTP redirect.
//
// The endpoint is form-urlencoded with a single `data` field whose
// value is a JSON string — same quirk as oauth2/access_token above.

export interface SsoLoginInput {
  // Where the user should land in LW after the SSO handshake. Must be
  // a full URL.
  redirectUrl: string;
  // Provide ONE of the following two identifiers. user_id is preferred
  // (no email-mismatch risk, no profile overwrite). email is used for
  // first-time link-up; LW will create a new LW user if no match.
  user_id?: string;
  email?: string;
  // Required when LW has to create a new user (i.e. when only email is
  // passed and no LW user exists yet). When user_id is provided we
  // omit username so we don't overwrite the user's LW-side profile.
  username?: string;
}

export interface SsoLoginResult {
  url: string;
  user_id: string | null;
}

export async function ssoLogin(input: SsoLoginInput): Promise<SsoLoginResult> {
  if (!input.redirectUrl) {
    throw new Error("ssoLogin: redirectUrl required");
  }
  if (!input.user_id && !input.email) {
    throw new Error("ssoLogin: either user_id or email required");
  }
  const apiUrl = (RAW_API_URL ?? "").replace(/\/$/, "");
  const clientId = process.env.LEARNWORLDS_CLIENT_ID;
  if (!apiUrl || !clientId) {
    throw new Error("ssoLogin: LEARNWORLDS_API_URL and LEARNWORLDS_CLIENT_ID required");
  }
  const token = await getAccessToken();

  // Build the JSON payload per the LW Custom SSO doc. user_id wins
  // over email if both are passed — LW's doc explicitly says email is
  // ignored when user_id is provided.
  const payload: Record<string, string> = {
    redirectUrl: input.redirectUrl,
  };
  if (input.user_id) {
    payload.user_id = input.user_id;
  } else if (input.email) {
    payload.email = input.email;
    if (input.username) payload.username = input.username;
  }

  const body = new URLSearchParams();
  body.set("data", JSON.stringify(payload));

  const res = await fetch(`${apiUrl}/sso`, {
    method: "POST",
    headers: {
      "Lw-Client": clientId,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(
      `LW sso ${res.status} ${res.statusText}: ${errBody.slice(0, 300)}`,
    );
  }
  const json = (await res.json()) as {
    success?: boolean;
    url?: string;
    user_id?: string;
    errors?: unknown;
  };
  if (!json.success || !json.url) {
    throw new Error(
      `LW sso unsuccessful response: ${JSON.stringify(json).slice(0, 300)}`,
    );
  }
  return {
    url: json.url,
    user_id: json.user_id ?? null,
  };
}
