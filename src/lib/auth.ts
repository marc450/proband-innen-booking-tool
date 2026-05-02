import { cookies } from "next/headers";

export type UserRole = "admin" | "nutzer";

// Server-side helper: read the cached user role set by updateSession() in
// src/lib/supabase/middleware.ts. The cookie is httpOnly so only server
// components / route handlers can read it; client components must receive
// it via props.
//
// Defaults to "nutzer" (not admin) when the cookie is missing or invalid.
// This is the safe default: anyone whose profile we can't resolve is
// treated as a non-admin. Confirmed admin users always get an explicit
// "admin" cookie set by updateSession() on every authenticated request.
export async function getUserRole(): Promise<UserRole> {
  const store = await cookies();
  const value = store.get("x-user-role")?.value;
  return value === "admin" ? "admin" : "nutzer";
}

export async function isAdmin(): Promise<boolean> {
  return (await getUserRole()) === "admin";
}

// Reads the cached `is_kursbetreuung` profile flag set by
// updateSession() in src/lib/supabase/middleware.ts. Independent of
// the role, a "nutzer" can ALSO be kursbetreuung.
export async function isKursbetreuung(): Promise<boolean> {
  const store = await cookies();
  return store.get("x-is-kursbetreuung")?.value === "1";
}

// Visibility gate for the shared customerlove inbox. Both admins and
// kursbetreuung users are allowed; everyone else is redirected away.
export async function canAccessInbox(): Promise<boolean> {
  if (await isAdmin()) return true;
  return await isKursbetreuung();
}
