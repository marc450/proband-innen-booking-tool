import { createClient } from "@/lib/supabase/server";
import { ConversationMobile } from "./conversation-mobile";

export default async function MobileConversationPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;

  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, title, first_name, last_name, role")
    .eq("role", "admin")
    .order("last_name", { ascending: true });

  // Mirror of the desktop inbox: first names only since this is
  // staff-internal. Keep the two-letter initials computed from
  // first+last for the avatar pill.
  const teamMembers = (profiles || []).map((p) => ({
    id: p.id,
    name: p.first_name?.trim() || p.last_name?.trim() || "Unbekannt",
    initials: ((p.first_name?.[0] || "") + (p.last_name?.[0] || "")).toUpperCase() || "?",
  }));

  return <ConversationMobile threadId={threadId} teamMembers={teamMembers} />;
}
