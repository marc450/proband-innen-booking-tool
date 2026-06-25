export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CHECKLIST_ITEM_KEYS } from "@/lib/course-checklist";
import { ChecklistView, type ChecklistItemState } from "./checklist-view";

function profileName(
  p: { title: string | null; first_name: string | null; last_name: string | null } | null,
): string | null {
  if (!p) return null;
  const parts = [p.title, p.first_name, p.last_name].filter(Boolean);
  return parts.length ? parts.join(" ") : null;
}

export default async function ChecklistDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, title, first_name, last_name")
    .eq("id", user.id)
    .single();
  if (!profile || (profile.role !== "admin" && profile.role !== "nutzer")) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();

  const { data: session } = await admin
    .from("course_sessions")
    .select(
      "id, date_iso, label_de, instructor_name, betreuer_name, address, template:course_templates!course_sessions_template_id_fkey(title)",
    )
    .eq("id", sessionId)
    .maybeSingle<{
      id: string;
      date_iso: string;
      label_de: string | null;
      instructor_name: string | null;
      betreuer_name: string | null;
      address: string | null;
      template: { title: string } | null;
    }>();

  if (!session) notFound();

  const { data: itemsData } = await admin
    .from("course_checklist_items")
    .select(
      "item_key, checked, checked_at, checker:profiles!course_checklist_items_checked_by_fkey(title, first_name, last_name)",
    )
    .eq("course_session_id", sessionId);

  const validKeys = new Set(CHECKLIST_ITEM_KEYS);
  const state: Record<string, ChecklistItemState> = {};
  for (const row of (itemsData ?? []) as unknown as {
    item_key: string;
    checked: boolean;
    checked_at: string | null;
    checker: {
      title: string | null;
      first_name: string | null;
      last_name: string | null;
    } | null;
  }[]) {
    if (!validKeys.has(row.item_key) || !row.checked) continue;
    state[row.item_key] = {
      checked: true,
      checked_at: row.checked_at,
      checked_by_name: profileName(row.checker),
    };
  }

  const currentUserName =
    profileName({
      title: profile.title,
      first_name: profile.first_name,
      last_name: profile.last_name,
    }) ?? "Dir";

  return (
    <ChecklistView
      sessionId={session.id}
      courseTitle={session.template?.title || session.label_de || "Kurstermin"}
      dateIso={session.date_iso}
      instructorName={session.instructor_name}
      betreuerName={session.betreuer_name}
      address={session.address}
      initialState={state}
      currentUserName={currentUserName}
    />
  );
}
