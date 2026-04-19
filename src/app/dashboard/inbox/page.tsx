import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatPersonName } from "@/lib/utils";
import { InboxManager } from "./inbox-manager";

export default async function InboxPage() {
  if (!(await isAdmin())) redirect("/dashboard");

  const supabase = await createClient();

  // Fetch team members for assignment dropdown
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, title, first_name, last_name, role")
    .eq("role", "admin")
    .order("last_name", { ascending: true });

  // Get current user ID
  const { data: { user } } = await supabase.auth.getUser();

  const teamMembers = (profiles || []).map((p) => ({
    id: p.id,
    name: formatPersonName({ title: p.title, firstName: p.first_name, lastName: p.last_name }) || "Unbekannt",
    initials: ((p.first_name?.[0] || "") + (p.last_name?.[0] || "")).toUpperCase() || "?",
  }));

  return (
    <div className="fixed top-0 bottom-0 left-14 right-0 bg-white">
      <InboxManager teamMembers={teamMembers} currentUserId={user?.id || ""} />
    </div>
  );
}
