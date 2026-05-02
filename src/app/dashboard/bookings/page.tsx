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
            instructor
          )
        )
      `)
      .order("created_at", { ascending: false }),
    supabase.from("courses").select("id, title, treatment_title, location, course_date").order("course_date", { ascending: true }),
  ]);

  return (
    <BookingsManager
      initialBookings={(bookings || []).map(decryptBookingWithDetails)}
      courses={courses || []}
      isAdmin={isAdmin}
    />
  );
}
