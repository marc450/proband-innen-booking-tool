export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptBooking } from "@/lib/encryption";
import { CoursesOverview, type SlotBooking } from "./courses-overview";

export default async function MobileTerminePage() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const [
    { data: courses },
    { data: slots },
    { data: bookingRows },
    { data: templates },
    { data: sessions },
  ] = await Promise.all([
    // Behandlungstermine data
    supabase
      .from("courses")
      .select("*")
      .eq("status", "online")
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
      .order("date_iso", { ascending: true }),
  ]);

  // Group decrypted bookings by slot_id so the UI can render a clickable
  // patient link per booking.
  const slotBookings: Record<string, SlotBooking[]> = {};
  for (const raw of bookingRows || []) {
    try {
      const b = decryptBooking(raw);
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
