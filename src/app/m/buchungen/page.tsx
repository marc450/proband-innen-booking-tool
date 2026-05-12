export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptBookingWithDetails } from "@/lib/encryption";
import { cookies } from "next/headers";
import { BookingsList } from "./bookings-list";

export default async function MobileBookingsPage() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("x-user-role")?.value === "admin";

  const [{ data: bookings }, { data: courseBookings }] = await Promise.all([
    // Proband:innen bookings
    supabase
      .from("bookings")
      .select(`
        *,
        slots (
          course_id,
          start_time,
          end_time,
          courses (
            title,
            course_date,
            instructor:profiles!instructor_id ( title, first_name, last_name )
          )
        )
      `)
      .order("created_at", { ascending: false }),
    // Ärzt:innen bookings
    adminSupabase
      .from("course_bookings")
      .select(
        "*, course_sessions(date_iso, label_de, instructor_name), course_templates:template_id(title, course_label_de)"
      )
      .order("created_at", { ascending: false }),
  ]);

  // Load the patient rows for every booking that has a patient_id so the
  // list shows the canonical patient name instead of the booking's
  // frozen-at-booking-time snapshot. See dashboard/bookings/page.tsx for
  // why this is a separate batched query and not a relationship hint.
  const patientIds = Array.from(
    new Set(
      (bookings || [])
        .map((b) => b.patient_id)
        .filter((id): id is string => !!id),
    ),
  );
  const patientRows = patientIds.length
    ? (
        await supabase
          .from("patients")
          .select(
            "id, encrypted_data, encrypted_key, encryption_iv, first_name, last_name",
          )
          .in("id", patientIds)
      ).data ?? []
    : [];
  const patientById = new Map(patientRows.map((p) => [p.id as string, p]));

  const enrichedBookings = (bookings || []).map((row) => {
    const patient = row.patient_id ? patientById.get(row.patient_id) : null;
    return decryptBookingWithDetails(patient ? { ...row, patient } : row);
  });

  return (
    <BookingsList
      initialBookings={enrichedBookings}
      initialCourseBookings={courseBookings || []}
      isAdmin={isAdmin}
    />
  );
}
