import { createAdminClient } from "@/lib/supabase/admin";
import { AuszubildendeManager } from "./auszubildende-manager";

export const dynamic = "force-dynamic";

export default async function AuszubildendePersonenPage() {
  const supabase = createAdminClient();

  const { data: auszubildende } = await supabase
    .from("auszubildende")
    .select("*")
    .order("last_name", { ascending: true });

  // Get booking counts per auszubildende
  const { data: bookingCounts } = await supabase
    .from("course_bookings")
    .select("auszubildende_id")
    .not("auszubildende_id", "is", null);

  const countMap: Record<string, number> = {};
  if (bookingCounts) {
    for (const b of bookingCounts) {
      if (b.auszubildende_id) {
        countMap[b.auszubildende_id] = (countMap[b.auszubildende_id] || 0) + 1;
      }
    }
  }

  return (
    <AuszubildendeManager
      initialAuszubildende={auszubildende ?? []}
      bookingCounts={countMap}
    />
  );
}
