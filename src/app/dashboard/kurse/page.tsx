import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { KurseTable, type KurseRow } from "./kurse-table";

export const dynamic = "force-dynamic";

export default async function KursePage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("x-user-role")?.value;
  if (role !== "admin" && role !== "nutzer") {
    redirect("/login");
  }

  const admin = createAdminClient();

  // No date cutoff — staff need historical sessions visible for
  // tracking. Sessions without a Proband:innen satellite simply show
  // "—" in the Proband:innen column.
  const { data: sessions } = await admin
    .from("course_sessions")
    .select(
      "id, date_iso, start_time, duration_minutes, label_de, instructor_name, betreuer_name, max_seats, booked_seats, cme_status, vnr_praxis, has_zahnmedizin, is_live, template_id",
    )
    .order("date_iso", { ascending: true });

  const sessionList = sessions ?? [];
  const templateIds = Array.from(
    new Set(sessionList.map((s) => s.template_id).filter((x): x is string => !!x)),
  );

  const [{ data: templates }, { data: satellites }, { data: zahnBookings }] = await Promise.all([
    templateIds.length
      ? admin
          .from("course_templates")
          .select("id, title, course_label_de, course_key")
          .in("id", templateIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; course_label_de: string | null; course_key: string | null }> }),
    sessionList.length
      ? admin
          .from("courses")
          .select("id, session_id, status, course_date")
          .in(
            "session_id",
            sessionList.map((s) => s.id),
          )
      : Promise.resolve({
          data: [] as Array<{
            id: string;
            session_id: string;
            status: string;
            course_date: string | null;
          }>,
        }),
    sessionList.length
      ? admin
          .from("course_bookings")
          .select("session_id")
          .eq("audience_tag", "Zahnmediziner:in")
          .neq("status", "cancelled")
      : Promise.resolve({ data: [] as Array<{ session_id: string | null }> }),
  ]);

  const zahnCountBySessionId = new Map<string, number>();
  for (const b of zahnBookings ?? []) {
    if (!b.session_id) continue;
    zahnCountBySessionId.set(
      b.session_id as string,
      (zahnCountBySessionId.get(b.session_id as string) ?? 0) + 1,
    );
  }

  const templateById = new Map((templates ?? []).map((t) => [t.id, t]));
  const satelliteBySessionId = new Map(
    (satellites ?? []).map((c) => [c.session_id as string, c]),
  );

  const courseIds = (satellites ?? []).map((c) => c.id as string);
  const { data: slotData } = courseIds.length
    ? await admin
        .from("available_slots")
        .select("course_id, capacity, remaining_capacity")
        .in("course_id", courseIds)
    : { data: [] as Array<{ course_id: string; capacity: number; remaining_capacity: number }> };

  const probandSeatsByCourseId = new Map<string, { booked: number; total: number }>();
  for (const s of slotData ?? []) {
    const cur = probandSeatsByCourseId.get(s.course_id as string) ?? { booked: 0, total: 0 };
    cur.total += s.capacity ?? 0;
    cur.booked += (s.capacity ?? 0) - (s.remaining_capacity ?? 0);
    probandSeatsByCourseId.set(s.course_id as string, cur);
  }

  // Proband:innen rolling visibility horizon. Mirrors the public-facing
  // logic in src/app/kurse/werde-proband-in/page.tsx and src/app/book/
  // privat/page.tsx: a satellite is only surfaced to patients when its
  // course_date sits in [today, today + 2 months]. The badge in the
  // table reflects what patients actually see right now, not just the
  // raw `status` flag.
  const todayIso = new Date().toISOString().slice(0, 10);
  const horizonDate = new Date();
  horizonDate.setMonth(horizonDate.getMonth() + 2);
  const horizonIso = horizonDate.toISOString().slice(0, 10);

  const rows: KurseRow[] = sessionList.map((s) => {
    const tmpl = templateById.get(s.template_id as string);
    const satellite = satelliteBySessionId.get(s.id as string);
    const probands = satellite
      ? probandSeatsByCourseId.get(satellite.id as string) ?? { booked: 0, total: 0 }
      : null;
    // Proband:innen "Live" = published AND inside the 2-month window.
    // Outside the window the row is technically published but invisible
    // to patients, so we render it as Offline so admins aren't misled.
    // No satellite at all = `null` (renders as `—`).
    let probandLive: boolean | null;
    if (!satellite) {
      probandLive = null;
    } else {
      const status = (satellite.status as string | null) ?? null;
      const courseDate = (satellite.course_date as string | null) ?? null;
      probandLive =
        status === "published" &&
        courseDate != null &&
        courseDate >= todayIso &&
        courseDate <= horizonIso;
    }
    return {
      id: s.id as string,
      templateId: (s.template_id as string | null) ?? null,
      dateIso: s.date_iso as string,
      startTime: (s.start_time as string | null) ?? null,
      durationMinutes: (s.duration_minutes as number | null) ?? null,
      courseTitle: tmpl?.course_label_de || tmpl?.title || "—",
      courseKey: (tmpl?.course_key as string | null) ?? null,
      instructorName: (s.instructor_name as string | null) ?? null,
      betreuerName: (s.betreuer_name as string | null) ?? null,
      aerztBooked: (s.booked_seats as number | null) ?? 0,
      aerztMax: (s.max_seats as number | null) ?? 0,
      probandBooked: probands ? probands.booked : null,
      probandTotal: probands ? probands.total : null,
      zahnmedizinerCount: zahnCountBySessionId.get(s.id as string) ?? 0,
      cmeStatus: (s.cme_status as string | null) ?? null,
      vnrPraxis: (s.vnr_praxis as string | null) ?? null,
      isLive: (s.is_live as boolean | null) ?? false,
      probandLive,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kurse</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Alle Kurstermine. Klicke auf eine Zeile für Details (Dozent:in, Plätze, Buchungen, Notizen).
        </p>
      </div>
      <KurseTable rows={rows} />
    </div>
  );
}
