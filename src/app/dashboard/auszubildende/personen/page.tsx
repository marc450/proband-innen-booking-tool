import { createAdminClient } from "@/lib/supabase/admin";
import { AuszubildendeManager } from "./auszubildende-manager";

export const dynamic = "force-dynamic";

// The Kontakte menu reuses this page for two scopes:
//   ?type=auszubildende  → real Auszubildende (+ legacy NULL contact_type)
//   ?type=other          → "Sonstige" contacts (incl. legacy company rows)
// Defaulting to the auszubildende scope when no param is given keeps old
// deep-links and bookmarks working.
type Scope = "auszubildende" | "other";

export default async function AuszubildendePersonenPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const scope: Scope = params?.type === "other" ? "other" : "auszubildende";

  const supabase = createAdminClient();

  const { data: auszubildende } = await supabase
    .from("auszubildende")
    .select("*")
    .order("last_name", { ascending: true });

  const filtered = (auszubildende ?? []).filter((a) => {
    const ct = a.contact_type as string | null;
    if (scope === "other") {
      // "Sonstige" bucket: legacy company rows land here too because the
      // standalone "company" contact_type has been retired.
      return ct === "other" || ct === "company";
    }
    // "auszubildende" bucket: the explicit type plus any legacy row that
    // was created before contact_type existed (null).
    return ct === "auszubildende" || ct == null;
  });

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
      initialAuszubildende={filtered}
      bookingCounts={countMap}
      scope={scope}
    />
  );
}
