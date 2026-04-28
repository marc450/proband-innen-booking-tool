export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { Course, Slot, CourseTemplate, DozentUser } from "@/lib/types";
import { decryptBooking } from "@/lib/encryption";
import { CoursesManager, SlotBooking } from "../courses-manager";
import { cookies } from "next/headers";

// Behandlungstermine = the old "Proband:innen > Behandlungsangebote" page.
// Lists the training courses where Proband:innen book slots to be treated.
// This page used to live at /dashboard; it now has its own route so that
// /dashboard can default to the Kurstermine view instead.
export default async function BehandlungstermineePage() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const isAdmin = (cookieStore.get("x-user-role")?.value ?? "admin") === "admin";

  // Auto-expire past courses: set any course with a past date to offline
  const today = new Date().toISOString().slice(0, 10); // yyyy-MM-dd
  await supabase
    .from("courses")
    .update({ status: "offline" })
    .eq("status", "online")
    .lt("course_date", today);

  const [
    { data: courses },
    { data: slots },
    { data: rawBookings },
    { data: templates },
    { data: dozentUsers },
  ] = await Promise.all([
    supabase.from("courses").select("*").order("created_at", { ascending: false }),
    supabase.from("slots").select("*").order("start_time", { ascending: true }),
    supabase
      .from("bookings")
      .select("id, slot_id, status, patient_id, booking_type, referring_doctor, encrypted_data, encrypted_key, encryption_iv")
      .neq("status", "cancelled"),
    supabase.from("course_templates").select("*").order("title", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, title, first_name, last_name")
      .eq("is_dozent", true)
      .order("last_name", { ascending: true }),
  ]);

  const bookings: SlotBooking[] = (rawBookings || []).map((row) => {
    const decrypted = decryptBooking(row);
    return {
      id: decrypted.id,
      slot_id: decrypted.slot_id,
      name: decrypted.name || "",
      first_name: decrypted.first_name,
      last_name: decrypted.last_name,
      status: decrypted.status,
      patient_id: row.patient_id,
      booking_type: row.booking_type ?? null,
      referring_doctor: row.referring_doctor ?? null,
    };
  });

  return (
    <CoursesManager
      initialCourses={(courses as Course[]) || []}
      initialSlots={(slots as Slot[]) || []}
      initialBookings={bookings}
      templates={(templates as CourseTemplate[]) || []}
      dozentUsers={(dozentUsers as DozentUser[]) || []}
      isAdmin={isAdmin}
    />
  );
}
