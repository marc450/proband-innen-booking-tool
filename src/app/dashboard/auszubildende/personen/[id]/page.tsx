import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { isAdmin as checkIsAdmin } from "@/lib/auth";
import { AuszubildendeDetail } from "./auszubildende-detail";

export const dynamic = "force-dynamic";

export default async function AuszubildendeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isAdmin = await checkIsAdmin();
  const supabase = createAdminClient();

  const { data: azubi } = await supabase
    .from("auszubildende")
    .select("*")
    .eq("id", id)
    .single();

  if (!azubi) notFound();

  const [{ data: bookings }, { data: legacyBookings }] = await Promise.all([
    supabase
      .from("course_bookings")
      .select("*, course_sessions(date_iso, label_de, instructor_name), course_templates:template_id(title, course_label_de)")
      .eq("auszubildende_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("legacy_bookings")
      .select("id, product_name, amount_eur, course_date, purchased_at, source, created_at")
      .eq("auszubildende_id", id)
      .order("purchased_at", { ascending: false, nullsFirst: false }),
  ]);

  return (
    <AuszubildendeDetail
      azubi={azubi}
      bookings={bookings ?? []}
      legacyBookings={legacyBookings ?? []}
      isAdmin={isAdmin}
    />
  );
}
