// Shared access gate for the LMS write APIs and editor pages. The
// Lernzentrum is open to admins and to Autor:innen (staff with
// is_autor = true). Reads the logged-in user, then confirms
// profiles.role === 'admin' OR profiles.is_autor === true. Returns the
// user or null.
import { createClient } from "@/lib/supabase/server";

export async function assertLmsAccess() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_autor")
    .eq("id", user.id)
    .single();

  if (!profile) return null;
  return profile.role === "admin" || profile.is_autor === true ? user : null;
}
