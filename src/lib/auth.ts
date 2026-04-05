import { cookies } from "next/headers";

export type UserRole = "admin" | "nutzer";

// Server-side helper: read the cached user role set by updateSession() in
// src/lib/supabase/middleware.ts. The cookie is httpOnly so only server
// components / route handlers can read it; client components must receive
// it via props.
//
// Defaults to "admin" if the cookie is missing so new installs / first
// login don't accidentally hide features from the initial admin user.
// Middleware writes a concrete value as soon as the user has a profile.
export async function getUserRole(): Promise<UserRole> {
  const store = await cookies();
  const value = store.get("x-user-role")?.value;
  return value === "nutzer" ? "nutzer" : "admin";
}

export async function isAdmin(): Promise<boolean> {
  return (await getUserRole()) === "admin";
}
