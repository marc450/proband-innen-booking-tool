import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedClaims } from "@/lib/supabase/claims";
import { createAdminClient } from "@/lib/supabase/admin";
import { OffeneTermineView, type OpenProposal } from "./offene-termine-view";

export const dynamic = "force-dynamic";

export default async function OffeneTerminePage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("x-user-role")?.value;
  const isDozent = cookieStore.get("x-is-dozent")?.value === "1";
  // Dozent:innen (+ admins) only. Regular nutzer without the dozent flag
  // have nothing to do here.
  if (role !== "admin" && !isDozent) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const claims = await getVerifiedClaims(supabase);
  const userId = (claims?.sub as string | undefined) ?? "";
  if (!userId) redirect("/login");

  const admin = createAdminClient();

  const { data: proposals } = await admin
    .from("course_date_proposals")
    .select(
      "id, template_id, proposed_date, start_time, duration_minutes, max_seats, address, notes",
    )
    .eq("status", "open")
    .order("proposed_date", { ascending: true });

  const proposalList = proposals ?? [];
  const proposalIds = proposalList.map((p) => p.id as string);
  const templateIds = Array.from(
    new Set(proposalList.map((p) => p.template_id as string)),
  );

  const [{ data: templates }, { data: applications }] = await Promise.all([
    templateIds.length
      ? admin
          .from("course_templates")
          .select("id, title, course_label_de")
          .in("id", templateIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; course_label_de: string | null }> }),
    proposalIds.length
      ? admin
          .from("course_date_applications")
          .select("proposal_id, profile_id")
          .in("proposal_id", proposalIds)
      : Promise.resolve({ data: [] as Array<{ proposal_id: string; profile_id: string }> }),
  ]);

  const templateNameById = new Map(
    (templates ?? []).map((t) => [
      t.id as string,
      (t.course_label_de as string | null) || (t.title as string) || "—",
    ]),
  );

  const countByProposal = new Map<string, number>();
  const mineByProposal = new Set<string>();
  for (const a of applications ?? []) {
    const pid = a.proposal_id as string;
    countByProposal.set(pid, (countByProposal.get(pid) ?? 0) + 1);
    if ((a.profile_id as string) === userId) mineByProposal.add(pid);
  }

  const rows: OpenProposal[] = proposalList.map((p) => ({
    id: p.id as string,
    templateName: templateNameById.get(p.template_id as string) ?? "—",
    proposedDate: p.proposed_date as string,
    startTime: (p.start_time as string | null) ?? null,
    durationMinutes: (p.duration_minutes as number | null) ?? null,
    address: (p.address as string | null) ?? null,
    notes: (p.notes as string | null) ?? null,
    applicantCount: countByProposal.get(p.id as string) ?? 0,
    applied: mineByProposal.has(p.id as string),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Offene Termine</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Das sind die aktuell vorgeschlagenen Praxiskurs-Termine. Übernimm die Termine, die Du unterrichten möchtest. Mehrfachbewerbungen sind möglich. Das EPHIA-Team wählt anschließend aus und bestätigt Dich.
        </p>
      </div>
      <OffeneTermineView initialProposals={rows} />
    </div>
  );
}
