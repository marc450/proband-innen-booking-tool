export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { AvailableSlot, Course } from "@/lib/types";
import { BookingPage } from "./booking-page";

export default async function BookPage() {
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: slots } = await supabase
    .from("available_slots")
    .select("*")
    .gt("remaining_capacity", 0)
    .gt("start_time", new Date().toISOString())
    .order("start_time", { ascending: true });

  return (
    <BookingPage
      courses={(courses as Course[]) || []}
      slots={(slots as AvailableSlot[]) || []}
    />
  );
}
