export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { ArztProfile } from "./arzt-profile";

export default async function MobileArztDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: azubi } = await supabase
    .from("v_auszubildende")
    .select("*")
    .eq("id", id)
    .single();

  if (!azubi) notFound();

  const { data: bookings } = await supabase
    .from("course_bookings")
    .select(
      "*, course_sessions(date_iso, label_de, instructor_name), course_templates:template_id(title, course_label_de)"
    )
    .eq("auszubildende_id", id)
    .order("created_at", { ascending: false });

  const bookingIds = (bookings ?? []).map((b) => b.id);
  const { data: consentRows } = bookingIds.length
    ? await supabase
        .from("partner_data_consents")
        .select("id, consented_at, revoked_at, exported_at, signed_payload")
        .eq("partner", "galderma")
        .in("course_booking_id", bookingIds)
        .order("consented_at", { ascending: false, nullsFirst: false })
    : { data: [] };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const partnerConsents = (consentRows ?? []).map((r: any) => ({
    id: r.id as string,
    consentedAt: (r.consented_at as string | null) ?? null,
    revokedAt: (r.revoked_at as string | null) ?? null,
    exportedAt: (r.exported_at as string | null) ?? null,
    courseTitle: (r.signed_payload?.course_title as string | null) ?? "EPHIA-Kurs",
    courseDate: (r.signed_payload?.course_date as string | null) ?? "",
  }));

  return (
    <ArztProfile azubi={azubi} bookings={bookings ?? []} partnerConsents={partnerConsents} />
  );
}
