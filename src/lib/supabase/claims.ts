// Verified access-token claims, for the auth gates that used to read
// supabase.auth.getSession().user.
//
// getSession() does NOT verify the token's signature — it decodes whatever
// sits in the cookie. That's why auth-js wraps session.user in a proxy that
// logs "the values in it may not be authentic" on every property access, and
// why our logs were drowning in it: the middleware matcher runs on nearly
// every request, so each one emitted the warning from a fresh client.
//
// getClaims() verifies the ES256 signature against the project's public key
// before handing anything back, so the claims are trustworthy and the warning
// is gone. Passing our module-cached JWKS keeps it a local operation with no
// round trip (see ./jwks).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { JwtPayload } from "@supabase/auth-js";
import { getJwks } from "./jwks";

export type VerifiedClaims = JwtPayload;

// Returns the verified claims, or null when there's no session, the token is
// expired, or the signature doesn't check out. Callers treat null as
// "not authenticated" — same shape as the old `session?.user ?? null`.
export async function getVerifiedClaims(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
): Promise<VerifiedClaims | null> {
  const jwks = await getJwks();
  const { data, error } = await supabase.auth.getClaims(
    undefined,
    jwks ? { jwks } : undefined,
  );
  if (error || !data?.claims) return null;
  return data.claims;
}
