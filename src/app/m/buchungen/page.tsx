export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { decryptBookingWithDetails } from "@/lib/encryption";
import { cookies } from "next/headers";
import { BookingsList } from "./bookings-list";

export default async function MobileBookingsPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const isAdmin = (cookieStore.get("x-user-role")?.value ?? "admin") === "admin";

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
            course_date,
            instructor
          )
        )
      `)
      .order("created_at", { ascending: false }),
    supabase.from("courses").select("id, title").order("title"),
  ]);

  return (
    <BookingsList
      initialBookings={(bookings || []).map(decryptBookingWithDetails)}
      courses={courses || []}
      isAdmin={isAdmin}
    />
  );
}
