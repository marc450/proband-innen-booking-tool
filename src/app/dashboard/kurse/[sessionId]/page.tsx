import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptBooking } from "@/lib/encryption";
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
      "id, template_id, date_iso, label_de, instructor_name, betreuer_name, max_seats, booked_seats, address, start_time, duration_minutes, is_live, cme_status, vnr_praxis, has_zahnmedizin, course_templates:template_id(id, title, course_label_de)",
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
      .select("id, start_time, end_time, capacity, blocked, blocked_note")
      .eq("course_id", satellite.id)
      .order("start_time", { ascending: true });
    slots = (slotData ?? []) as DetailSlot[];

    if (slots.length > 0) {
      const { data: bookingRows } = await admin
        .from("bookings")
        .select(
          "id, slot_id, status, encrypted_data, encrypted_key, encryption_iv, booking_type, referring_doctor, created_at",
        )
        .in(
          "slot_id",
          slots.map((s) => s.id),
        );

      bookings = ((bookingRows ?? []).map((row) => {
        const decrypted = decryptBooking(row);
        return {
          id: decrypted.id,
          slot_id: decrypted.slot_id,
          first_name: decrypted.first_name,
          last_name: decrypted.last_name,
          email: decrypted.email,
          phone: decrypted.phone,
          notes: decrypted.notes ?? null,
          status: decrypted.status,
          booking_type: decrypted.booking_type ?? null,
          referring_doctor: decrypted.referring_doctor ?? null,
          created_at: decrypted.created_at,
        };
      })) as DetailBooking[];
    }
  }

  const { data: aerztBookings } = await admin
    .from("course_bookings")
    .select(
      "id, first_name, last_name, email, course_type, status, audience_tag, profile_complete, created_at, auszubildende_id",
    )
    .eq("session_id", sessionId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  // For each auszubildende_id on this session, look up their specialty
  // and count how many other (non-cancelled) course bookings they have.
  const auszubildendeIds = Array.from(
    new Set((aerztBookings ?? []).map((b) => b.auszubildende_id).filter((x): x is string => !!x)),
  );

  const [{ data: contactRows }, { data: priorCountRows }] = await Promise.all([
    auszubildendeIds.length
      ? admin.from("v_auszubildende").select("id, specialty").in("id", auszubildendeIds)
      : Promise.resolve({ data: [] as Array<{ id: string; specialty: string | null }> }),
    auszubildendeIds.length
      ? admin
          .from("course_bookings")
          .select("id, auszubildende_id")
          .in("auszubildende_id", auszubildendeIds)
          .neq("status", "cancelled")
      : Promise.resolve({ data: [] as Array<{ id: string; auszubildende_id: string }> }),
  ]);

  const specialtyByAuszubildendeId = new Map<string, string | null>(
    (contactRows ?? []).map((c) => [c.id as string, (c.specialty as string | null) ?? null]),
  );

  const totalBookingsByAuszubildendeId = new Map<string, number>();
  for (const row of priorCountRows ?? []) {
    const id = row.auszubildende_id as string | null;
    if (!id) continue;
    totalBookingsByAuszubildendeId.set(id, (totalBookingsByAuszubildendeId.get(id) ?? 0) + 1);
  }
  // "Bereits besuchte Kurse" = total non-cancelled course bookings for
  // this contact MINUS the one for the session being viewed.
  const priorCountByBookingId = new Map<string, number>();
  for (const b of aerztBookings ?? []) {
    const id = b.auszubildende_id as string | null;
    if (!id) {
      priorCountByBookingId.set(b.id as string, 0);
      continue;
    }
    const total = totalBookingsByAuszubildendeId.get(id) ?? 0;
    priorCountByBookingId.set(b.id as string, Math.max(0, total - 1));
  }

  const [{ data: dozentUsers }, { data: betreuerUsers }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, title, first_name, last_name")
      .eq("is_dozent", true)
      .order("last_name", { ascending: true }),
    admin
      .from("profiles")
      .select("id, title, first_name, last_name")
      .eq("is_kursbetreuung", true)
      .order("last_name", { ascending: true }),
  ]);

  return (
    <KursDetailClient
      session={{
        id: session.id as string,
        templateId: (session.template_id as string | null) ?? null,
        templateTitle:
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((session.course_templates as any)?.course_label_de ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (session.course_templates as any)?.title ||
            "—") as string,
        dateIso: session.date_iso as string,
        labelDe: (session.label_de as string | null) ?? null,
        startTime: (session.start_time as string | null) ?? null,
        durationMinutes: (session.duration_minutes as number | null) ?? null,
        address: (session.address as string | null) ?? null,
        instructorName: (session.instructor_name as string | null) ?? null,
        betreuerName: (session.betreuer_name as string | null) ?? null,
        maxSeats: (session.max_seats as number | null) ?? 0,
        bookedSeats: (session.booked_seats as number | null) ?? 0,
        isLive: (session.is_live as boolean | null) ?? false,
        cmeStatus: (session.cme_status as string | null) ?? null,
        vnrPraxis: (session.vnr_praxis as string | null) ?? null,
        hasZahnmedizin: (session.has_zahnmedizin as boolean | null) ?? false,
      }}
      satelliteId={(satellite?.id as string | null) ?? null}
      slots={slots}
      bookings={bookings}
      aerztBookings={
        (aerztBookings ?? []).map((b) => ({
          id: b.id as string,
          firstName: (b.first_name as string | null) ?? null,
          lastName: (b.last_name as string | null) ?? null,
          email: (b.email as string | null) ?? null,
          courseType: (b.course_type as string | null) ?? null,
          status: (b.status as string | null) ?? null,
          specialty:
            b.auszubildende_id
              ? specialtyByAuszubildendeId.get(b.auszubildende_id as string) ?? null
              : null,
          priorCourseCount: priorCountByBookingId.get(b.id as string) ?? 0,
          profileComplete: (b.profile_complete as boolean | null) ?? false,
        }))
      }
      dozentUsers={(dozentUsers ?? []).map((d) => ({
        id: d.id as string,
        title: (d.title as string | null) ?? null,
        firstName: (d.first_name as string | null) ?? null,
        lastName: (d.last_name as string | null) ?? null,
      }))}
      betreuerUsers={(betreuerUsers ?? []).map((d) => ({
        id: d.id as string,
        title: (d.title as string | null) ?? null,
        firstName: (d.first_name as string | null) ?? null,
        lastName: (d.last_name as string | null) ?? null,
      }))}
    />
  );
}
