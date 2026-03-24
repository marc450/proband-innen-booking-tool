export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { decryptBookingWithDetails } from "@/lib/encryption";
import { BookingsManager } from "./bookings-manager";

export default async function BookingsPage() {
  const supabase = await createClient();

  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      *,
      slots (
        course_id,
        start_time,
        end_time,
        courses (
          title
        )
      )
    `)
    .order("created_at", { ascending: false });

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, location")
    .order("title");

  return (
    <BookingsManager
      initialBookings={(bookings || []).map(decryptBookingWithDetails)}
      courses={courses || []}
    />
  );
}
