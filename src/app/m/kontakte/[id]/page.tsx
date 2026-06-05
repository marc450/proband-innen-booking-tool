import { createClient } from "@/lib/supabase/server";
import { decryptPatient, decryptBookingWithDetails } from "@/lib/encryption";
import { notFound } from "next/navigation";
import { isAdmin as checkIsAdmin } from "@/lib/auth";
import { ContactProfile } from "./contact-profile";

export const dynamic = "force-dynamic";

export default async function MobileContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isAdmin = await checkIsAdmin();
  const supabase = await createClient();

  const [{ data: patient, error }, { data: bookings }] = await Promise.all([
    supabase.from("patients").select("*").eq("id", id).single(),
    supabase
      .from("bookings")
      .select("*, slots(start_time, end_time, courses(title, course_date))")
      .eq("patient_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (error || !patient) {
    notFound();
  }

  // Attach the patient as the canonical name source: a booking's own
  // encrypted name snapshot is frozen at booking time and drifts when the
  // Patient:in is corrected later. decryptBookingWithDetails prefers the
  // patient name when the patient row is present.
  return (
    <ContactProfile
      patient={decryptPatient(patient)}
      bookings={(bookings || []).map((b) =>
        decryptBookingWithDetails({ ...b, patient }),
      )}
      isAdmin={isAdmin}
    />
  );
}
