import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ── Verified authorization for sensitive API routes ────────────────────
//
// getUserRole()/isAdmin() in @/lib/auth read the cached `x-user-role`
// cookie. That cookie is httpOnly, but httpOnly only stops *JavaScript*
// from reading it — it does NOT stop a client from *sending* a forged
// `x-user-role=admin` cookie in a hand-crafted request. The middleware
// also only re-derives the role from the DB when the cookie is missing,
// so a forged cookie is trusted as-is. That's fine for picking which nav
// to render, but unsafe as the sole gate in front of money (Anthropic)
// or PII.
//
// The helpers below never trust the cookie. They validate the session
// JWT with Supabase Auth (getUser hits the auth server) and read the
// role straight from the profiles table with the service-role client,
// keyed by the *validated* user id. Use these to gate anything that
// costs money or touches sensitive data from a route handler.

export interface VerifiedAccess {
  userId: string;
  /** Raw profiles.role: "admin" | "nutzer" | "student" | … Kept raw so
   *  callers can tell staff (admin/nutzer) apart from public customer
   *  accounts (student), which share the same auth.users table. */
  role: string;
  isKursbetreuung: boolean;
  isDozent: boolean;
}

/** Resolve the caller's role + kursbetreuung flag from the validated
 *  session, ignoring the x-user-role cookie entirely. Returns null when
 *  there is no valid session. */
export async function getVerifiedAccess(): Promise<VerifiedAccess | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Read the role with the service-role client keyed by the validated
  // user id. Service-role bypasses RLS, so the lookup can't be defeated
  // by a missing/odd policy, and the id came from a verified JWT so
  // there's nothing to spoof.
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, is_kursbetreuung, is_dozent")
    .eq("id", user.id)
    .single();

  return {
    userId: user.id,
    // Fail CLOSED. If there is no profiles row (or the role is blank),
    // resolve to a non-staff role rather than defaulting to "nutzer".
    // The old "nutzer" default was fail-OPEN: any authenticated account
    // WITHOUT a profile (e.g. a customer who never went through the
    // student set-password / SSO flow) was treated as staff and passed
    // requireVerifiedStaff, reaching send-campaign, import-patients,
    // inbox/merge, delete-patient, etc. A missing role must never grant
    // access; only an explicit admin/nutzer role does.
    role:
      typeof profile?.role === "string" && profile.role.length > 0
        ? profile.role
        : "",
    isKursbetreuung: profile?.is_kursbetreuung === true,
    isDozent: profile?.is_dozent === true,
  };
}

/** Verified-admin gate. Returns the access record for admins, else null. */
export async function requireVerifiedAdmin(): Promise<VerifiedAccess | null> {
  const access = await getVerifiedAccess();
  return access?.role === "admin" ? access : null;
}

/** Verified-staff gate (admin OR nutzer). This is exactly the role set
 *  the middleware already requires to reach the dashboard, so it's the
 *  correct gate for any API route called only from /dashboard or /m.
 *  Excludes public customer accounts (role 'student'). */
export async function requireVerifiedStaff(): Promise<VerifiedAccess | null> {
  const access = await getVerifiedAccess();
  if (!access) return null;
  return access.role === "admin" || access.role === "nutzer" ? access : null;
}

/** Verified inbox-access gate (admin OR kursbetreuung). Mirrors
 *  canAccessInbox() in @/lib/auth but without trusting the cookie. */
export async function requireVerifiedInbox(): Promise<VerifiedAccess | null> {
  const access = await getVerifiedAccess();
  if (!access) return null;
  return access.role === "admin" || access.isKursbetreuung ? access : null;
}

/** Verified Dozent:in gate (admin OR is_dozent staff). Gates the
 *  "open dates" apply surface so only instructors (and admins) can raise
 *  their hand for a proposed course date. Still requires a staff role —
 *  is_dozent is an orthogonal flag layered on admin/nutzer. */
export async function requireVerifiedDozent(): Promise<VerifiedAccess | null> {
  const access = await getVerifiedAccess();
  if (!access) return null;
  const isStaff = access.role === "admin" || access.role === "nutzer";
  if (!isStaff) return null;
  return access.role === "admin" || access.isDozent ? access : null;
}
