import { createClient } from "@/lib/supabase/server";
import { decryptPatient, decryptBookingWithDetails } from "@/lib/encryption";
import { notFound } from "next/navigation";
import { isAdmin as checkIsAdmin } from "@/lib/auth";
import { PatientDetail } from "./patient-detail";

export default async function PatientDetailPage({
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

  return (
    <PatientDetail
      patient={decryptPatient(patient)}
      bookings={(bookings || []).map(decryptBookingWithDetails)}
      isAdmin={isAdmin}
    />
  );
}
