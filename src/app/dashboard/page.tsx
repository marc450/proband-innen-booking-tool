export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { Course, Slot, CourseTemplate } from "@/lib/types";
import { decryptBooking } from "@/lib/encryption";
import { CoursesManager, SlotBooking } from "./courses-manager";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: slots } = await supabase
    .from("slots")
    .select("*")
    .order("start_time", { ascending: true });

  const { data: rawBookings } = await supabase
    .from("bookings")
    .select("id, slot_id, status, patient_id, encrypted_data, encrypted_key, encryption_iv")
    .neq("status", "cancelled");

  const { data: templates } = await supabase
    .from("course_templates")
    .select("*")
    .order("title", { ascending: true });

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
    };
  });

  return (
    <CoursesManager
      initialCourses={(courses as Course[]) || []}
      initialSlots={(slots as Slot[]) || []}
      initialBookings={bookings}
      templates={(templates as CourseTemplate[]) || []}
    />
  );
}
