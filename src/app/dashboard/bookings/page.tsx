export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { decryptBookingWithDetails } from "@/lib/encryption";
import { BookingsManager } from "./bookings-manager";
import { cookies } from "next/headers";

export default async function BookingsPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("x-user-role")?.value === "admin";

  const [{ data: bookings }, { data: courses }] = await Promise.all([
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
            treatment_title,
            instructor:profiles!instructor_id ( title, first_name, last_name )
          )
        )
      `)
      .order("created_at", { ascending: false }),
    supabase.from("courses").select("id, title, treatment_title, location, course_date").order("course_date", { ascending: true }),
  ]);

  // Load the patient rows for every booking that has a patient_id so the
  // list can show the canonical patient name instead of the booking's
  // frozen-at-booking-time name snapshot. Done as a separate batched
  // query rather than a Postgres-relationship join because the
  // bookings.patient_id FK constraint isn't declared in the tracked
  // migrations, so PostgREST can't always resolve the relationship hint.
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
    <BookingsManager
      initialBookings={enrichedBookings}
      courses={courses || []}
      isAdmin={isAdmin}
    />
  );
}
