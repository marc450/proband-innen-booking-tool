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

export interface LwUserCourse {
  // The LW course identifier — for slug-based courses this matches
  // the URL slug (e.g. "grundkurs-botulinum-online"). For older
  // numeric-id courses it's the integer id as a string.
  id: string;
  title?: string;
  // Progress percentage 0..100. LW sometimes returns this as a number,
  // sometimes as a string; we coerce in getProgressMap.
  progress_rate?: number | string;
  // ISO timestamp of the last unit interaction. Useful for "Zuletzt:
  // gestern" labels in v3.
  last_accessed?: string;
  status?: string;
  time_spent?: number | string;
}

// Fetch every course the user is enrolled in, with progress fields.
// One API call per /mein-konto load. Returns [] when the user has no
// LW courses (or no LW account).
export async function listUserCourses(lwUserId: string): Promise<LwUserCourse[]> {
  if (!lwUserId) return [];
  const result = await lwFetch<{ data?: LwUserCourse[] }>(
    `/v2/users/${encodeURIComponent(lwUserId)}/courses`,
    { allow404: true },
  );
  return result?.data ?? [];
}

// Build a quick lookup of courseId → progress percent from a user
// courses response. Centralises the type coercion (LW occasionally
// serialises numbers as strings).
export function buildProgressMap(courses: LwUserCourse[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const c of courses) {
    if (!c.id) continue;
    const raw = c.progress_rate;
    const pct =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? Number(raw)
          : NaN;
    if (!Number.isFinite(pct)) continue;
    // Clamp to [0, 100] — LW occasionally returns 100.0001 from
    // floating-point aggregation.
    map.set(c.id, Math.max(0, Math.min(100, pct)));
  }
  return map;
}
