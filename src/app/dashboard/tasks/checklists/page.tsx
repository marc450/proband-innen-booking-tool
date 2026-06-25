export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CHECKLIST_ITEM_KEYS } from "@/lib/course-checklist";
import { ChecklistsOverview, type ChecklistSession } from "./checklists-overview";

export default async function ChecklistsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || (profile.role !== "admin" && profile.role !== "nutzer")) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();

  const [{ data: sessionsData }, { data: itemsData }] = await Promise.all([
    admin
      .from("course_sessions")
      .select(
        "id, date_iso, label_de, instructor_name, betreuer_name, template:course_templates!course_sessions_template_id_fkey(title)",
      )
      .order("date_iso", { ascending: false }),
    // Only checked rows matter for the progress badge; unchecked items
    // never get a row (or get one set back to false on un-tick).
    admin
      .from("course_checklist_items")
      .select("course_session_id, item_key, checked")
      .eq("checked", true),
  ]);

  // Count valid checked items per session. Guard against keys that were
  // removed from the template after being ticked — they don't count.
  const validKeys = new Set(CHECKLIST_ITEM_KEYS);
  const checkedBySession = new Map<string, number>();
  for (const row of itemsData ?? []) {
    if (!validKeys.has(row.item_key)) continue;
    checkedBySession.set(
      row.course_session_id,
      (checkedBySession.get(row.course_session_id) ?? 0) + 1,
    );
  }

  const sessions: ChecklistSession[] = (
    (sessionsData ?? []) as unknown as {
      id: string;
      date_iso: string;
      label_de: string | null;
      instructor_name: string | null;
      betreuer_name: string | null;
      template: { title: string } | null;
    }[]
  ).map((s) => ({
    id: s.id,
    date_iso: s.date_iso,
    label_de: s.label_de,
    instructor_name: s.instructor_name,
    betreuer_name: s.betreuer_name,
    template_title: s.template?.title ?? null,
    checked_count: checkedBySession.get(s.id) ?? 0,
  }));

  return <ChecklistsOverview sessions={sessions} />;
}
