// Shared admin gate for the LMS write APIs and editor pages. Mirrors
// the assertAdmin pattern used in /api/admin/users: read the logged-in
// user, confirm profiles.role === 'admin'. Returns the user or null.
import { createClient } from "@/lib/supabase/server";

export async function assertLmsAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin" ? user : null;
}
