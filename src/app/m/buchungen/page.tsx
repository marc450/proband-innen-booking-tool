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
  const isAdmin = (cookieStore.get("x-user-role")?.value ?? "admin") === "admin";

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
            instructor
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

  return (
    <BookingsList
      initialBookings={(bookings || []).map(decryptBookingWithDetails)}
      initialCourseBookings={courseBookings || []}
      isAdmin={isAdmin}
    />
  );
}
