import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptBookingWithDetails } from "@/lib/encryption";
import { listUserProgress, buildProgressMap } from "@/lib/learnworlds";
import { KursDetailClient, type DetailBooking, type DetailSlot } from "./kurs-detail";

export const dynamic = "force-dynamic";

export default async function KursDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const cookieStore = await cookies();
  const role = cookieStore.get("x-user-role")?.value;
  if (role !== "admin" && role !== "nutzer") redirect("/login");

  const { sessionId } = await params;
  const admin = createAdminClient();

  const { data: session } = await admin
    .from("course_sessions")
    .select(
      "id, date_iso, start_time, duration_minutes, address, instructor_name, betreuer_name, max_seats, booked_seats, course_templates:template_id(id, title, course_label_de, course_key, online_course_id)",
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) notFound();

  const { data: satellite } = await admin
    .from("courses")
    .select("id, status, instructor_id")
    .eq("session_id", sessionId)
    .maybeSingle();

  let slots: DetailSlot[] = [];
  let bookings: DetailBooking[] = [];

  if (satellite) {
    const { data: slotData } = await admin
      .from("slots")
      .select(
        "id, start_time, end_time, capacity, blocked, blocked_note, masseter_eligible, masseter_capacity, slot_type",
      )
      .eq("course_id", satellite.id)
      .order("start_time", { ascending: true });
    slots = (slotData ?? []) as DetailSlot[];

    if (slots.length > 0) {
      const { data: bookingRows } = await admin
        .from("bookings")
        .select(
          "id, slot_id, patient_id, status, encrypted_data, encrypted_key, encryption_iv, booking_type, referring_doctor, indication, created_at",
        )
        .in(
          "slot_id",
          slots.map((s) => s.id),
        )
        .neq("status", "cancelled");

      // Canonical name lookup: a booking carries its own encrypted name
      // snapshot from booking time, which drifts if the Patient:in is later
      // corrected. Load the linked patient rows so we can prefer the
      // profile name (same pattern as the Ärzt:innen list below and the
      // /dashboard/bookings list). Falls back to the booking snapshot for
      // bookings without a patient_id.
      const patientIds = Array.from(
        new Set(
          (bookingRows ?? [])
            .map((r) => r.patient_id as string | null)
            .filter((id): id is string => !!id),
        ),
      );
      const patientRows = patientIds.length
        ? (
            await admin
              .from("patients")
              .select(
                "id, encrypted_data, encrypted_key, encryption_iv, first_name, last_name",
              )
              .in("id", patientIds)
          ).data ?? []
        : [];
      const patientById = new Map(patientRows.map((p) => [p.id as string, p]));

      bookings = ((bookingRows ?? []).map((row) => {
        const patient = row.patient_id ? patientById.get(row.patient_id as string) : null;
        const decrypted = decryptBookingWithDetails(patient ? { ...row, patient } : row);
        return {
          id: decrypted.id,
          slot_id: decrypted.slot_id,
          patient_id: (row.patient_id as string | null) ?? null,
          first_name: decrypted.first_name,
          last_name: decrypted.last_name,
          email: decrypted.email,
          phone: decrypted.phone,
          notes: decrypted.notes ?? null,
          status: decrypted.status,
          booking_type: decrypted.booking_type ?? null,
          referring_doctor: decrypted.referring_doctor ?? null,
          indication: (row.indication as string | null) ?? null,
          created_at: decrypted.created_at,
        };
      })) as DetailBooking[];
    }
  }

  const { data: aerztBookings } = await admin
    .from("course_bookings")
    .select(
      "id, first_name, last_name, email, course_type, status, audience_tag, profile_complete, created_at, auszubildende_id, notes",
    )
    .eq("session_id", sessionId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  // For each auszubildende_id on this session, look up their specialty
  // and count how many other (non-cancelled) course bookings they have.
  const auszubildendeIds = Array.from(
    new Set((aerztBookings ?? []).map((b) => b.auszubildende_id).filter((x): x is string => !!x)),
  );

  const [{ data: contactRows }, { data: priorRows }] = await Promise.all([
    auszubildendeIds.length
      ? admin
          .from("v_auszubildende")
          .select(
            "id, specialty, first_name, last_name, phone, address_line1, address_postal_code, address_city, address_country, lw_user_id",
          )
          .in("id", auszubildendeIds)
      : Promise.resolve({
          data: [] as Array<{
            id: string;
            specialty: string | null;
            first_name: string | null;
            last_name: string | null;
            phone: string | null;
            address_line1: string | null;
            address_postal_code: string | null;
            address_city: string | null;
            address_country: string | null;
            lw_user_id: string | null;
          }>,
        }),
    auszubildendeIds.length
      ? admin
          .from("course_bookings")
          .select(
            "id, auszubildende_id, course_type, created_at, course_templates:template_id(course_label_de, title), course_sessions:session_id(date_iso)",
          )
          .in("auszubildende_id", auszubildendeIds)
          .neq("status", "cancelled")
      : Promise.resolve({
          data: [] as Array<{
            id: string;
            auszubildende_id: string;
            course_type: string | null;
            created_at: string;
            course_templates: { course_label_de: string | null; title: string | null } | null;
            course_sessions: { date_iso: string | null } | null;
          }>,
        }),
  ]);

  const specialtyByAuszubildendeId = new Map<string, string | null>(
    (contactRows ?? []).map((c) => [c.id as string, (c.specialty as string | null) ?? null]),
  );

  // Phone + composed postal address for the Galderma consent prefill, so
  // the Kursbetreuung sees what's on file and only corrects if needed.
  const composeAddr = (c: {
    address_line1: string | null;
    address_postal_code: string | null;
    address_city: string | null;
    address_country: string | null;
  }): string | null => {
    const cityLine = [c.address_postal_code, c.address_city].filter(Boolean).join(" ");
    const parts = [c.address_line1, cityLine, c.address_country].filter((p) => p && p.trim());
    return parts.length ? parts.join(", ") : null;
  };
  const prefillByAuszubildendeId = new Map<
    string,
    { phone: string | null; address: string | null }
  >(
    (contactRows ?? []).map((c) => [
      c.id as string,
      {
        phone: (c.phone as string | null) ?? null,
        address: composeAddr(
          c as {
            address_line1: string | null;
            address_postal_code: string | null;
            address_city: string | null;
            address_country: string | null;
          },
        ),
      },
    ]),
  );

  // Galderma consent state per booking on this session.
  const allBookingIds = (aerztBookings ?? []).map((b) => b.id as string);
  const { data: consentRows } = allBookingIds.length
    ? await admin
        .from("partner_data_consents")
        .select("course_booking_id, consented_at, revoked_at, exported_at")
        .eq("partner", "galderma")
        .in("course_booking_id", allBookingIds)
    : { data: [] as Array<{ course_booking_id: string; consented_at: string | null; revoked_at: string | null; exported_at: string | null }> };
  const consentByBookingId = new Map<
    string,
    { consentedAt: string | null; revokedAt: string | null; exportedAt: string | null }
  >(
    (consentRows ?? []).map((r) => [
      r.course_booking_id as string,
      {
        consentedAt: (r.consented_at as string | null) ?? null,
        revokedAt: (r.revoked_at as string | null) ?? null,
        exportedAt: (r.exported_at as string | null) ?? null,
      },
    ]),
  );

  // ── Onlinekurs-Fortschritt ──────────────────────────────────────────
  // For a quick completion check by the Kursbetreuung: resolve each
  // participant's LearnWorlds progress on THIS session's online course.
  // The session's template carries a single online_course_id, so we look
  // up that one course's progress_rate per distinct LW user. One LW API
  // call per participant with an LW account; capped to a few in flight so
  // a large session doesn't fan out dozens of requests at once. LW failure
  // or a missing account degrades to "no data" rather than failing the page.
  const onlineCourseId =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((session.course_templates as any)?.online_course_id as string | null) ?? null;

  const lwUserIdByAuszubildendeId = new Map<string, string | null>(
    (contactRows ?? []).map((c) => [c.id as string, (c.lw_user_id as string | null) ?? null]),
  );

  // Per contact on this session: { hasAccount, pct }. Absent from the map
  // means "no online course on this template" — nothing to check.
  const onlineProgressByAuszubildendeId = new Map<
    string,
    { hasAccount: boolean; pct: number | null }
  >();

  if (onlineCourseId) {
    // Distinct LW users among this session's participants.
    const lwUserIds = Array.from(
      new Set(
        auszubildendeIds
          .map((id) => lwUserIdByAuszubildendeId.get(id) ?? null)
          .filter((x): x is string => !!x),
      ),
    );

    // Fetch progress with a small concurrency cap.
    const pctByLwUserId = new Map<string, number | null>();
    const CONCURRENCY = 4;
    for (let i = 0; i < lwUserIds.length; i += CONCURRENCY) {
      const batch = lwUserIds.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        batch.map(async (lwUserId) => {
          try {
            const progress = await listUserProgress(lwUserId);
            const map = buildProgressMap(progress);
            return [lwUserId, map.get(onlineCourseId) ?? null] as const;
          } catch (err) {
            console.error("LW listUserProgress failed for", lwUserId, err);
            return [lwUserId, null] as const;
          }
        }),
      );
      for (const [lwUserId, pct] of results) pctByLwUserId.set(lwUserId, pct);
    }

    for (const azid of auszubildendeIds) {
      const lwUserId = lwUserIdByAuszubildendeId.get(azid) ?? null;
      if (!lwUserId) {
        onlineProgressByAuszubildendeId.set(azid, { hasAccount: false, pct: null });
        continue;
      }
      // Not in the progress list → enrolled/known user but course never
      // opened. Treat as 0% (nicht begonnen) so it reads as "not done".
      onlineProgressByAuszubildendeId.set(azid, {
        hasAccount: true,
        pct: pctByLwUserId.get(lwUserId) ?? 0,
      });
    }
  }

  const courseDateHuman = new Date(`${session.date_iso as string}T12:00:00`).toLocaleDateString(
    "de-DE",
    { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" },
  );

  // Canonical name lookup: course_bookings.first_name/last_name is a
  // snapshot from the Stripe checkout form and can drift if the Arzt:in
  // later corrects their profile. Always prefer the auszubildende name
  // when we have a profile link (matches what the profile page shows and
  // what the cert email puts on the certificate).
  const canonicalNameByAuszubildendeId = new Map<
    string,
    { firstName: string | null; lastName: string | null }
  >(
    (contactRows ?? []).map((c) => [
      c.id as string,
      {
        firstName: (c.first_name as string | null) ?? null,
        lastName: (c.last_name as string | null) ?? null,
      },
    ]),
  );

  // "Bereits besuchte Kurse": list other courses this contact has
  // attended. For Praxis/Kombi/Premium, "attended" = the linked
  // session's date_iso is in the past. Onlinekurs is evergreen access
  // so the purchase date (created_at) is the relevant signal.
  const todayBerlinIso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
  }).format(new Date());
  const currentBookingIds = new Set((aerztBookings ?? []).map((b) => b.id as string));
  const priorTitlesByAuszubildendeId = new Map<string, string[]>();
  for (const row of priorRows ?? []) {
    if (currentBookingIds.has(row.id as string)) continue;
    const id = row.auszubildende_id as string | null;
    if (!id) continue;

    const courseType = (row.course_type as string | null) ?? null;
    let qualifies = false;
    if (courseType === "Onlinekurs") {
      const purchaseDay = ((row.created_at as string) ?? "").slice(0, 10);
      qualifies = !!purchaseDay && purchaseDay < todayBerlinIso;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sess = row.course_sessions as any;
      const sessionDate = (sess?.date_iso as string | null) ?? null;
      qualifies = !!sessionDate && sessionDate < todayBerlinIso;
    }
    if (!qualifies) continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tmpl = row.course_templates as any;
    const name = tmpl?.course_label_de || tmpl?.title;
    if (!name) continue;
    if (!priorTitlesByAuszubildendeId.has(id)) priorTitlesByAuszubildendeId.set(id, []);
    priorTitlesByAuszubildendeId.get(id)!.push(name);
  }

  // Zahnmediziner:innen on this session drive the masseter reservation:
  // each one needs a masseter proband. aerztBookings is already filtered
  // to non-cancelled rows above.
  const dentistCount = (aerztBookings ?? []).filter(
    (b) => b.audience_tag === "Zahnmediziner:in",
  ).length;

  return (
    <KursDetailClient
      dentistCount={dentistCount}
      session={{
        id: session.id as string,
        templateTitle:
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((session.course_templates as any)?.course_label_de ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (session.course_templates as any)?.title ||
            "—") as string,
        dateIso: session.date_iso as string,
        startTime: (session.start_time as string | null) ?? null,
        durationMinutes: (session.duration_minutes as number | null) ?? null,
        address: (session.address as string | null) ?? null,
        instructorName: (session.instructor_name as string | null) ?? null,
        betreuerName: (session.betreuer_name as string | null) ?? null,
        maxSeats: (session.max_seats as number | null) ?? 0,
        bookedSeats: (session.booked_seats as number | null) ?? 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        courseKey: ((session.course_templates as any)?.course_key ?? null) as
          | string
          | null,
      }}
      satelliteId={(satellite?.id as string | null) ?? null}
      slots={slots}
      bookings={bookings}
      aerztBookings={
        (aerztBookings ?? []).map((b) => {
          const azid = (b.auszubildende_id as string | null) ?? null;
          const canonical = azid ? canonicalNameByAuszubildendeId.get(azid) : null;
          // Prefer canonical name from auszubildende; fall back to the
          // booking snapshot only if the canonical field is empty (e.g.
          // never filled by the contact).
          const firstName =
            (canonical?.firstName ?? null) || (b.first_name as string | null) || null;
          const lastName =
            (canonical?.lastName ?? null) || (b.last_name as string | null) || null;
          return ({
          id: b.id as string,
          auszubildendeId: azid,
          firstName,
          lastName,
          email: (b.email as string | null) ?? null,
          courseType: (b.course_type as string | null) ?? null,
          status: (b.status as string | null) ?? null,
          specialty:
            b.auszubildende_id
              ? specialtyByAuszubildendeId.get(b.auszubildende_id as string) ?? null
              : null,
          priorCourses:
            b.auszubildende_id
              ? priorTitlesByAuszubildendeId.get(b.auszubildende_id as string) ?? []
              : [],
          profileComplete: (b.profile_complete as boolean | null) ?? false,
          onlineProgress: azid
            ? onlineProgressByAuszubildendeId.get(azid) ?? null
            : null,
          notes: (b.notes as string | null) ?? null,
          consent: consentByBookingId.get(b.id as string) ?? null,
          prefillPhone: azid ? prefillByAuszubildendeId.get(azid)?.phone ?? null : null,
          prefillAddress: azid ? prefillByAuszubildendeId.get(azid)?.address ?? null : null,
          });
        })
      }
      courseDate={courseDateHuman}
    />
  );
}
