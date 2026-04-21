export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { SessionDetail, type Participant } from "./session-detail";

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
  };

  const azubiById = new Map<string, AzubiRow>();
  for (const row of (auszubildendeRows || []) as AzubiRow[]) azubiById.set(row.id, row);

  const priorCountsById = new Map<string, number>();
  for (const row of priorBookingRows || []) {
    if (!row.auszubildende_id) continue;
    if (row.session_id === sessionId) continue;
    if (!["booked", "completed"].includes(row.status)) continue;
    priorCountsById.set(row.auszubildende_id, (priorCountsById.get(row.auszubildende_id) || 0) + 1);
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
      betreuerName={session.betreuer_name}
      address={session.address}
      startTime={session.start_time}
      durationMinutes={session.duration_minutes}
      maxSeats={session.max_seats}
      bookedSeats={session.booked_seats}
      isLive={session.is_live}
      cmeStatus={session.cme_status}
      participants={participants}
    />
  );
}
