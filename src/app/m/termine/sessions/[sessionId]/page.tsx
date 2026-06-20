export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptBooking, decryptPatient } from "@/lib/encryption";
import { SessionDetail, type Participant, type Proband } from "./session-detail";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

// Session detail view for Dozent:innen: who is in their upcoming course,
// specialty mix, practice affiliations, returning vs new, and a quick tap
// through to each doctor's profile. All data is plaintext (Auszubildende
// side has no E2EE).
export default async function MobileSessionDetailPage({ params }: PageProps) {
  const { sessionId } = await params;
  const admin = createAdminClient();

  // 1. Session + template
  const { data: session } = await admin
    .from("course_sessions")
    .select("*, course_templates(*)")
    .eq("id", sessionId)
    .single();

  if (!session) notFound();

  // 2. Confirmed bookings for this session
  const { data: bookingRows } = await admin
    .from("course_bookings")
    .select("id, first_name, last_name, email, phone, course_type, amount_paid, status, audience_tag, created_at, auszubildende_id")
    .eq("session_id", sessionId)
    .in("status", ["booked", "completed"])
    .order("created_at", { ascending: true });

  const bookings = bookingRows || [];

  // 3. Auszubildende profiles for the linked bookings
  const auszubildendeIds = Array.from(
    new Set(bookings.map((b) => b.auszubildende_id).filter((v): v is string => !!v)),
  );

  const [{ data: auszubildendeRows }, { data: priorBookingRows }] = await Promise.all([
    auszubildendeIds.length
      ? admin.from("v_auszubildende").select("*").in("id", auszubildendeIds)
      : Promise.resolve({ data: [] as unknown[] }),
    auszubildendeIds.length
      ? admin
          .from("course_bookings")
          .select("auszubildende_id, session_id, status")
          .in("auszubildende_id", auszubildendeIds)
      : Promise.resolve({ data: [] as Array<{ auszubildende_id: string | null; session_id: string | null; status: string }> }),
  ]);

  type AzubiRow = {
    id: string;
    title: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    specialty: string | null;
    gender: string | null;
    company_name: string | null;
    notes: string | null;
    contact_type: string | null;
    efn: string | null;
    birthdate: string | null;
    profile_complete: boolean | null;
    address_city: string | null;
    address_line1: string | null;
    address_postal_code: string | null;
    address_country: string | null;
  };

  const azubiById = new Map<string, AzubiRow>();
  for (const row of (auszubildendeRows || []) as AzubiRow[]) azubiById.set(row.id, row);

  // Galderma consent state per booking, for the in-room tablet flow.
  const bookingIds = bookings.map((b) => b.id);
  const { data: consentRows } = bookingIds.length
    ? await admin
        .from("partner_data_consents")
        .select("course_booking_id, consented_at, revoked_at")
        .eq("partner", "galderma")
        .in("course_booking_id", bookingIds)
    : { data: [] as Array<{ course_booking_id: string; consented_at: string | null; revoked_at: string | null }> };
  const consentByBookingId = new Map<string, { consentedAt: string | null; revokedAt: string | null }>(
    (consentRows ?? []).map((r) => [
      r.course_booking_id as string,
      {
        consentedAt: (r.consented_at as string | null) ?? null,
        revokedAt: (r.revoked_at as string | null) ?? null,
      },
    ]),
  );

  const composeAddr = (a: AzubiRow): string | null => {
    const cityLine = [a.address_postal_code, a.address_city].filter(Boolean).join(" ");
    const parts = [a.address_line1, cityLine, a.address_country].filter((p) => p && p.trim());
    return parts.length ? parts.join(", ") : null;
  };

  const courseDateHuman = new Date(`${session.date_iso as string}T12:00:00`).toLocaleDateString(
    "de-DE",
    { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" },
  );

  // Count prior completed or booked sessions (excluding this session) per
  // auszubildende, so we can flag returning participants for the Dozent:in.
  const priorCountsById = new Map<string, number>();
  for (const row of priorBookingRows || []) {
    if (!row.auszubildende_id) continue;
    if (row.session_id === sessionId) continue;
    if (!["booked", "completed"].includes(row.status)) continue;
    priorCountsById.set(row.auszubildende_id, (priorCountsById.get(row.auszubildende_id) || 0) + 1);
  }

  // 4. Proband:innen on the same day: every course_session has a satellite
  // `courses` row (linked via courses.session_id, see migration 073). The
  // satellite holds the slots that Proband:innen book into. We load those
  // bookings here so the mobile detail view shows who Dozent:in actually
  // treats at which slot.
  const { data: satelliteCourse } = await admin
    .from("courses")
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle();

  let probanden: Proband[] = [];
  if (satelliteCourse?.id) {
    const { data: slotRows } = await admin
      .from("slots")
      .select("id, start_time")
      .eq("course_id", satelliteCourse.id);
    const slotById = new Map(
      (slotRows || []).map((s) => [s.id as string, s.start_time as string]),
    );
    const slotIds = (slotRows || []).map((s) => s.id as string);

    if (slotIds.length) {
      // first_name / last_name auf bookings sind keine echten Spalten —
      // sie leben verschlüsselt in encrypted_data und werden unten via
      // decryptBooking gelesen. Sie hier zu selectieren produziert
      // einen 42703 "column does not exist" Fehler, der die gesamte
      // Query auf 0 Rows fallen lässt — exakt das war der "Proband:innen
      // (0)"-Bug auf dem Mobile-Sessiondetail (Marc-Bugreport
      // 2026-05-31, vorher unbemerkt weil der Pfad ohne Logging still
      // gescheitert ist).
      const { data: bookingRows } = await admin
        .from("bookings")
        .select(
          "id, slot_id, status, booking_type, referring_doctor, encrypted_data, encrypted_key, encryption_iv, patient_id",
        )
        .in("slot_id", slotIds)
        .neq("status", "cancelled");

      // Pull patient rows for canonical names (booking row's name snapshot
      // can drift if the patient is corrected later). Mirrors the desktop
      // dashboard's bookings page pattern.
      const patientIds = Array.from(
        new Set(
          (bookingRows || [])
            .map((b) => b.patient_id)
            .filter((v): v is string => !!v),
        ),
      );
      const { data: patientRows } = patientIds.length
        ? await admin
            .from("patients")
            .select(
              "id, encrypted_data, encrypted_key, encryption_iv, first_name, last_name",
            )
            .in("id", patientIds)
        : { data: [] };
      const patientById = new Map(
        (patientRows || []).map((p) => [p.id as string, p]),
      );

      probanden = (bookingRows || []).map((row) => {
        const decrypted = decryptBooking(row);
        const patient = row.patient_id ? patientById.get(row.patient_id) : null;
        const patientDecrypted = patient ? decryptPatient(patient) : null;
        const firstName =
          patientDecrypted?.first_name ?? decrypted.first_name ?? null;
        const lastName =
          patientDecrypted?.last_name ?? decrypted.last_name ?? null;
        return {
          bookingId: row.id,
          firstName,
          lastName,
          slotStart: slotById.get(row.slot_id as string) ?? null,
          status: row.status,
          bookingType: row.booking_type ?? null,
          referringDoctor: row.referring_doctor ?? null,
        };
      });

      // Sort by slot start time, then by last name for stable order within a slot
      probanden.sort((a, b) => {
        const ta = a.slotStart || "";
        const tb = b.slotStart || "";
        if (ta !== tb) return ta.localeCompare(tb);
        return (a.lastName || "").localeCompare(b.lastName || "");
      });
    }
  }

  const participants: Participant[] = bookings.map((b) => {
    const azubi = b.auszubildende_id ? azubiById.get(b.auszubildende_id) : undefined;
    return {
      bookingId: b.id,
      auszubildendeId: b.auszubildende_id,
      title: azubi?.title ?? null,
      firstName: azubi?.first_name ?? b.first_name ?? null,
      lastName: azubi?.last_name ?? b.last_name ?? null,
      email: azubi?.email ?? b.email ?? null,
      phone: azubi?.phone ?? b.phone ?? null,
      specialty: azubi?.specialty ?? null,
      gender: azubi?.gender ?? null,
      companyName: azubi?.company_name ?? null,
      addressCity: azubi?.address_city ?? null,
      notes: azubi?.notes ?? null,
      contactType: azubi?.contact_type ?? null,
      efn: azubi?.efn ?? null,
      profileComplete: azubi?.profile_complete ?? null,
      courseType: b.course_type,
      audienceTag: b.audience_tag ?? null,
      amountPaid: b.amount_paid,
      bookingStatus: b.status,
      createdAt: b.created_at,
      priorSessionsCount: b.auszubildende_id ? priorCountsById.get(b.auszubildende_id) || 0 : 0,
      consent: consentByBookingId.get(b.id) ?? null,
      prefillPhone: azubi?.phone ?? b.phone ?? null,
      prefillAddress: azubi ? composeAddr(azubi) : null,
    };
  });

  return (
    <SessionDetail
      sessionId={session.id}
      templateTitle={session.course_templates?.title || "Kurs"}
      courseLabelDe={session.course_templates?.course_label_de || null}
      dateIso={session.date_iso}
      labelDe={session.label_de}
      instructorName={session.instructor_name}
      address={session.address}
      startTime={session.start_time}
      durationMinutes={session.duration_minutes}
      maxSeats={session.max_seats}
      bookedSeats={session.booked_seats}
      participants={participants}
      probanden={probanden}
      courseDate={courseDateHuman}
    />
  );
}
