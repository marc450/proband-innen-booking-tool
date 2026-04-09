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

  const teamMembers = (profiles || []).map((p) => ({
    id: p.id,
    name: [p.title, p.first_name, p.last_name].filter(Boolean).join(" ") || "Unbekannt",
    initials: ((p.first_name?.[0] || "") + (p.last_name?.[0] || "")).toUpperCase() || "?",
  }));

  return <ConversationMobile threadId={threadId} teamMembers={teamMembers} />;
}
