import { redirect } from "next/navigation";
import { canAccessInbox } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { InboxManager } from "./inbox-manager";

export default async function InboxPage() {
  if (!(await canAccessInbox())) redirect("/dashboard");

  const supabase = await createClient();

  // Fetch team members for the assignment dropdown. Both admins and
  // kursbetreuung users can be assigned threads, so the list is the
  // union of the two cohorts.
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, title, first_name, last_name, role, is_kursbetreuung")
    .or("role.eq.admin,is_kursbetreuung.eq.true")
    .order("last_name", { ascending: true });

  // Get current user ID
  const { data: { user } } = await supabase.auth.getUser();

  // Inbox is internal-only, so we show first names only in the
  // assignment dropdown and on the assigned pill. Titles and last names
  // are still pulled from `profiles` because the initials below need
  // the last-name letter, and so the data source matches the gmail-
  // assignments API which also returns first-name-only.
  const teamMembers = (profiles || []).map((p) => ({
    id: p.id,
    name: p.first_name?.trim() || p.last_name?.trim() || "Unbekannt",
    initials: ((p.first_name?.[0] || "") + (p.last_name?.[0] || "")).toUpperCase() || "?",
  }));

  return (
    <div className="fixed top-0 bottom-0 left-14 right-0 bg-white">
      <InboxManager teamMembers={teamMembers} currentUserId={user?.id || ""} />
    </div>
  );
}
