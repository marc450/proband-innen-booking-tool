import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/auth";

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
  role: UserRole;
  isKursbetreuung: boolean;
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
    .select("role, is_kursbetreuung")
    .eq("id", user.id)
    .single();

  return {
    userId: user.id,
    role: profile?.role === "admin" ? "admin" : "nutzer",
    isKursbetreuung: profile?.is_kursbetreuung === true,
  };
}

/** Verified-admin gate. Returns the access record for admins, else null. */
export async function requireVerifiedAdmin(): Promise<VerifiedAccess | null> {
  const access = await getVerifiedAccess();
  return access?.role === "admin" ? access : null;
}

/** Verified inbox-access gate (admin OR kursbetreuung). Mirrors
 *  canAccessInbox() in @/lib/auth but without trusting the cookie. */
export async function requireVerifiedInbox(): Promise<VerifiedAccess | null> {
  const access = await getVerifiedAccess();
  if (!access) return null;
  return access.role === "admin" || access.isKursbetreuung ? access : null;
}
