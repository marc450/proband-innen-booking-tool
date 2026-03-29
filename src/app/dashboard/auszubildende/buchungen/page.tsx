import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { CourseBookingsManager } from "./course-bookings-manager";

export const dynamic = "force-dynamic";

export default async function CourseBookingsPage() {
  const supabase = createAdminClient();
  const cookieStore = await cookies();
  const isAdmin = (cookieStore.get("x-user-role")?.value ?? "admin") === "admin";

  const { data: bookings } = await supabase
    .from("course_bookings")
    .select("*, course_sessions(date_iso, label_de, instructor_name, start_time, duration_minutes, address), course_templates:template_id(title, course_label_de)")
    .order("created_at", { ascending: false });

  return <CourseBookingsManager initialBookings={bookings ?? []} isAdmin={isAdmin} />;
}
