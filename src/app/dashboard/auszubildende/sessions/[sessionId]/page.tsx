export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { SessionDetail, type Participant, type PriorBooking } from "./session-detail";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

// Dashboard session detail for Dozent:innen: roster + summary stats for an
// upcoming course session. Auszubildende data is plaintext (no E2EE).
export default async function SessionDetailPage({ params }: PageProps) {
  const { sessionId } = await params;
  const admin = createAdminClient();

  const { data: session } = await admin
    .from("course_sessions")
    .select("*, course_templates(*)")
    .eq("id", sessionId)
    .single();

  if (!session) notFound();

  const { data: bookingRows } = await admin
    .from("course_bookings")
    .select("id, first_name, last_name, email, phone, course_type, amount_paid, status, audience_tag, created_at, auszubildende_id")
    .eq("session_id", sessionId)
    .in("status", ["booked", "completed"])
    .order("created_at", { ascending: true });

  const bookings = bookingRows || [];

  const auszubildendeIds = Array.from(
    new Set(bookings.map((b) => b.auszubildende_id).filter((v): v is string => !!v)),
  );

  const [{ data: auszubildendeRows }, { data: priorBookingRows }] = await Promise.all([
    auszubildendeIds.length
      ? admin.from("auszubildende").select("*").in("id", auszubildendeIds)
      : Promise.resolve({ data: [] as unknown[] }),
    auszubildendeIds.length
      ? admin
          .from("course_bookings")
          .select("auszubildende_id, session_id, template_id, status, course_type, created_at")
          .in("auszubildende_id", auszubildendeIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as Array<{ auszubildende_id: string | null; session_id: string | null; template_id: string | null; status: string; course_type: string | null; created_at: string }> }),
  ]);

  // Resolve the actual course label + session date for each prior
  // booking so the Historie cell can show "Aufbaukurs Botulinum 14.05.25"
  // instead of just a "Kombi" pill. Two parallel lookups (templates +
  // sessions) keyed by id.
  const priorTemplateIds = Array.from(
    new Set(
      (priorBookingRows || [])
        .map((r) => r.template_id)
        .filter((v): v is string => !!v),
    ),
  );
  const priorSessionIds = Array.from(
    new Set(
      (priorBookingRows || [])
        .map((r) => r.session_id)
        .filter((v): v is string => !!v && v !== sessionId),
    ),
  );
  const [{ data: priorTemplateRows }, { data: priorSessionRows }] = await Promise.all([
    priorTemplateIds.length
      ? admin
          .from("course_templates")
          .select("id, title, course_label_de")
          .in("id", priorTemplateIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string | null; course_label_de: string | null }> }),
    priorSessionIds.length
      ? admin
          .from("course_sessions")
          .select("id, date_iso")
          .in("id", priorSessionIds)
      : Promise.resolve({ data: [] as Array<{ id: string; date_iso: string | null }> }),
  ]);

  const templateLabelById = new Map<string, string>();
  for (const t of priorTemplateRows || []) {
    const label = t.course_label_de || t.title;
    if (label) templateLabelById.set(t.id, label);
  }
  const sessionDateById = new Map<string, string>();
  for (const s of priorSessionRows || []) {
    if (s.date_iso) sessionDateById.set(s.id, s.date_iso);
  }

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
  };

  const azubiById = new Map<string, AzubiRow>();
  for (const row of (auszubildendeRows || []) as AzubiRow[]) azubiById.set(row.id, row);

  const priorBookingsById = new Map<string, PriorBooking[]>();
  for (const row of priorBookingRows || []) {
    if (!row.auszubildende_id) continue;
    if (row.session_id === sessionId) continue;
    if (!["booked", "completed"].includes(row.status)) continue;
    if (!row.course_type) continue;
    const list = priorBookingsById.get(row.auszubildende_id) || [];
    list.push({
      courseType: row.course_type,
      courseTitle: row.template_id
        ? templateLabelById.get(row.template_id) ?? null
        : null,
      sessionDateIso: row.session_id
        ? sessionDateById.get(row.session_id) ?? null
        : null,
    });
    priorBookingsById.set(row.auszubildende_id, list);
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
      priorBookings: b.auszubildende_id ? priorBookingsById.get(b.auszubildende_id) || [] : [],
    };
  });

  return (
    <SessionDetail
      sessionId={session.id}
      templateTitle={session.course_templates?.title || "Kurs"}
      courseLabelDe={session.course_templates?.course_label_de || null}
      dateIso={session.date_iso}
      instructorName={session.instructor_name}
      betreuerName={session.betreuer_name}
      address={session.address}
      startTime={session.start_time}
      durationMinutes={session.duration_minutes}
      maxSeats={session.max_seats}
      bookedSeats={session.booked_seats}
      participants={participants}
    />
  );
}
