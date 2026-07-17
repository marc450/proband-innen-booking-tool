import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { CourseBookingsManager } from "./course-bookings-manager";

export const dynamic = "force-dynamic";

export default async function CourseBookingsPage() {
  const supabase = createAdminClient();
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("x-user-role")?.value === "admin";

  const { data: bookings } = await supabase
    .from("course_bookings")
    .select(
      // Pull the current auszubildende name alongside the historical copy
      // stored on the booking row so the list reflects profile renames.
      "*, course_sessions(date_iso, label_de, instructor_name, start_time, duration_minutes, address), course_templates:template_id(title, course_label_de), auszubildende:auszubildende_id(title, first_name, last_name)"
    )
    .order("created_at", { ascending: false });

  // Umbuchungen whose Umbuchungsgebühr is still outstanding. These hold seats
  // (migration 154), so the list marks them and blocks status changes until the
  // move is either paid or withdrawn.
  const { data: holds } = await supabase
    .from("course_rebooking_holds")
    .select("id, booking_id, to_session_id, fee_cents, surcharge_cents, expires_at");

  return (
    <CourseBookingsManager
      initialBookings={bookings ?? []}
      initialHolds={holds ?? []}
      isAdmin={isAdmin}
    />
  );
}
