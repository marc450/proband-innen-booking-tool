import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchBerlinHolidays } from "@/lib/holidays";
import { KursplanungManager, type ProposalRow, type TemplateOption } from "./kursplanung-manager";
import { YearCalendar, type CalendarProposal } from "./year-calendar";

export const dynamic = "force-dynamic";

function dozentName(p: {
  title: string | null;
  first_name: string | null;
  last_name: string | null;
}): string {
  return [p.title, p.first_name, p.last_name].filter(Boolean).join(" ") || "Unbekannt";
}

export default async function KursplanungPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const cookieStore = await cookies();
  const role = cookieStore.get("x-user-role")?.value;
  if (role !== "admin") {
    redirect("/login");
  }

  // Berlin "today" for the year-overview highlight + default year.
  const todayIso = new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Berlin",
  });
  const currentYear = parseInt(todayIso.slice(0, 4), 10);
  const { year: yearParam } = await searchParams;
  const parsedYear = yearParam ? parseInt(yearParam, 10) : currentYear;
  // Guard against garbage/out-of-range ?year= values.
  const year =
    Number.isFinite(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100
      ? parsedYear
      : currentYear;

  const admin = createAdminClient();

  const holidays = await fetchBerlinHolidays(year);

  const [{ data: templates }, { data: proposals }, { data: sessionTemplateRows }] =
    await Promise.all([
      admin
        .from("course_templates")
        .select("id, title, course_label_de, course_key")
        .order("title", { ascending: true }),
      admin
        .from("course_date_proposals")
        .select(
          "id, status, template_id, proposed_date, start_time, duration_minutes, max_seats, address, notes, assigned_profile_id, created_session_id",
        )
        .order("proposed_date", { ascending: true }),
      // How often each course actually runs, used to sort the create-dialog
      // dropdown so the most frequently scheduled courses sit at the top.
      admin.from("course_sessions").select("template_id"),
    ]);

  const sessionCountByTemplate = new Map<string, number>();
  for (const row of sessionTemplateRows ?? []) {
    const tid = row.template_id as string | null;
    if (!tid) continue;
    sessionCountByTemplate.set(tid, (sessionCountByTemplate.get(tid) ?? 0) + 1);
  }

  const proposalList = proposals ?? [];
  const proposalIds = proposalList.map((p) => p.id as string);

  const { data: applications } = proposalIds.length
    ? await admin
        .from("course_date_applications")
        .select("id, proposal_id, profile_id, status, note, created_at")
        .in("proposal_id", proposalIds)
        .order("created_at", { ascending: true })
    : { data: [] as Array<Record<string, unknown>> };

  // Resolve all referenced profile ids (applicants + assigned) to names.
  const profileIds = new Set<string>();
  for (const a of applications ?? []) profileIds.add(a.profile_id as string);
  for (const p of proposalList) {
    if (p.assigned_profile_id) profileIds.add(p.assigned_profile_id as string);
  }
  const { data: profiles } = profileIds.size
    ? await admin
        .from("profiles")
        .select("id, title, first_name, last_name")
        .in("id", Array.from(profileIds))
    : { data: [] as Array<{ id: string; title: string | null; first_name: string | null; last_name: string | null }> };
  const nameById = new Map(
    (profiles ?? []).map((p) => [p.id as string, dozentName(p)]),
  );

  const templateNameById = new Map(
    (templates ?? []).map((t) => [
      t.id as string,
      (t.course_label_de as string | null) || (t.title as string) || "—",
    ]),
  );

  const appsByProposal = new Map<string, ProposalRow["applications"]>();
  for (const a of applications ?? []) {
    const pid = a.proposal_id as string;
    const list = appsByProposal.get(pid) ?? [];
    list.push({
      id: a.id as string,
      profileId: a.profile_id as string,
      name: nameById.get(a.profile_id as string) ?? "Unbekannt",
      status: a.status as string,
      note: (a.note as string | null) ?? null,
    });
    appsByProposal.set(pid, list);
  }

  const rows: ProposalRow[] = proposalList.map((p) => ({
    id: p.id as string,
    status: p.status as ProposalRow["status"],
    templateName: templateNameById.get(p.template_id as string) ?? "—",
    proposedDate: p.proposed_date as string,
    startTime: (p.start_time as string | null) ?? null,
    durationMinutes: (p.duration_minutes as number | null) ?? null,
    maxSeats: (p.max_seats as number | null) ?? null,
    address: (p.address as string | null) ?? null,
    notes: (p.notes as string | null) ?? null,
    assignedName: p.assigned_profile_id
      ? nameById.get(p.assigned_profile_id as string) ?? null
      : null,
    createdSessionId: (p.created_session_id as string | null) ?? null,
    applications: appsByProposal.get(p.id as string) ?? [],
  }));

  const templateOptions: TemplateOption[] = (templates ?? [])
    .map((t) => ({
      id: t.id as string,
      label: (t.course_label_de as string | null) || (t.title as string) || "—",
      count: sessionCountByTemplate.get(t.id as string) ?? 0,
    }))
    // Most frequently scheduled courses first; alphabetical as a tiebreak
    // (and so courses that have never run yet stay in a stable order).
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map(({ id, label }) => ({ id, label }));

  // Plot every proposal (not just this year's) on the calendar; the
  // component filters to the displayed year itself.
  const calendarProposals: CalendarProposal[] = rows.map((r) => ({
    date: r.proposedDate,
    status: r.status,
    courseLabel: r.templateName,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kursplanung</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Lege offene Praxiskurs-Termine an, auf die sich Dozent:innen bewerben können. Wähle anschließend eine:n Dozent:in aus und bestätige. Der Kurs wird als Termin angelegt und ist zunächst offline.
        </p>
      </div>
      <YearCalendar
        year={year}
        currentYear={currentYear}
        todayIso={todayIso}
        publicHolidays={holidays.publicHolidays}
        schoolHolidays={holidays.schoolHolidays}
        proposals={calendarProposals}
      />
      <KursplanungManager initialProposals={rows} templates={templateOptions} />
    </div>
  );
}
