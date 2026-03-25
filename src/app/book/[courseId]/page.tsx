export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { AvailableSlot, Course } from "@/lib/types";
import { SlotSelection } from "./slot-selection";
import { notFound } from "next/navigation";

export default async function CourseBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ slot?: string }>;
}) {
  const { courseId } = await params;
  const { slot: initialSlotId } = await searchParams;
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();

  if (!course) {
    notFound();
  }

  const { data: slots } = await supabase
    .from("available_slots")
    .select("*")
    .eq("course_id", courseId)
    .gt("remaining_capacity", 0)
    .gt("start_time", new Date().toISOString())
    .order("start_time", { ascending: true });

  return (
    <SlotSelection
      course={course as Course}
      slots={(slots as AvailableSlot[]) || []}
      initialSlotId={initialSlotId}
    />
  );
}
