import { createClient } from "@/lib/supabase/server";
import { decryptPatient, decryptBookingWithDetails } from "@/lib/encryption";
import { notFound } from "next/navigation";
import { PatientDetail } from "./patient-detail";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: patient, error } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !patient) {
    notFound();
  }

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, slots(start_time, end_time, courses(title, course_date))")
    .eq("patient_id", id)
    .order("created_at", { ascending: false });

  return (
    <PatientDetail
      patient={decryptPatient(patient)}
      bookings={(bookings || []).map(decryptBookingWithDetails)}
    />
  );
}
