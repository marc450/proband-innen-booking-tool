export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptBookingWithDetails } from "@/lib/encryption";
import { CoursesOverview, type SlotBooking } from "./courses-overview";

export default async function MobileTerminePage() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  // "Today" anchored to Europe/Berlin so a 1am request doesn't accidentally
  // hide today's date because UTC is still on yesterday.
  const todayBerlinIso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
  }).format(new Date());

  const [
    { data: courses },
    { data: slots },
    { data: bookingRows },
    { data: templates },
    { data: sessions },
  ] = await Promise.all([
    // Behandlungstermine data — only today and future
    supabase
      .from("courses")
      .select("*, instructor:profiles!instructor_id(title, first_name, last_name)")
      .eq("status", "published")
      .gte("course_date", todayBerlinIso)
      .order("course_date", { ascending: true }),
    supabase
      .from("slots")
      .select("*")
      .order("start_time"),
    // Fetch full booking rows so we can decrypt the patient name for each slot.
    supabase
      .from("bookings")
      .select("*")
      .in("status", ["booked", "attended"]),
    // Kurstermine data
    adminSupabase
      .from("course_templates")
      .select("*")
      .not("course_key", "is", null)
      .order("title", { ascending: true }),
    adminSupabase
      .from("course_sessions")
      .select("*")
      .gte("date_iso", todayBerlinIso)
      .order("date_iso", { ascending: true }),
  ]);

  // Canonical name lookup: a booking's encrypted name snapshot is frozen
  // at booking time and drifts when the Patient:in is corrected later.
  // Load linked patients so we can prefer the profile name (same pattern
  // as the desktop bookings list).
  const bookingPatientIds = Array.from(
    new Set(
      (bookingRows || [])
        .map((r) => r.patient_id as string | null)
        .filter((id): id is string => !!id),
    ),
  );
  const { data: bookingPatientRows } = bookingPatientIds.length
    ? await adminSupabase
        .from("patients")
        .select(
          "id, encrypted_data, encrypted_key, encryption_iv, first_name, last_name",
        )
        .in("id", bookingPatientIds)
    : { data: [] };
  const bookingPatientById = new Map(
    (bookingPatientRows || []).map((p) => [p.id as string, p]),
  );

  // Group decrypted bookings by slot_id so the UI can render a clickable
  // patient link per booking.
  const slotBookings: Record<string, SlotBooking[]> = {};
  for (const raw of bookingRows || []) {
    try {
      const patient = raw.patient_id
        ? bookingPatientById.get(raw.patient_id as string)
        : null;
      const b = decryptBookingWithDetails(patient ? { ...raw, patient } : raw);
      const fullName =
        [b.first_name, b.last_name].filter(Boolean).join(" ").trim() ||
        b.name ||
        b.email ||
        "Unbekannt";
      if (!slotBookings[b.slot_id]) slotBookings[b.slot_id] = [];
      slotBookings[b.slot_id].push({
        id: b.id,
        patientId: b.patient_id ?? null,
        name: fullName,
      });
    } catch {
      // If a single row fails to decrypt, skip it rather than breaking the page.
    }
  }

  return (
    <CoursesOverview
      courses={courses || []}
      slots={slots || []}
      slotBookings={slotBookings}
      templates={templates || []}
      sessions={sessions || []}
    />
  );
}
