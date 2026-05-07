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
    .from("v_auszubildende")
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
      .select("id, product_name, amount_cents, course_date, purchased_at, source, created_at")
      .eq("auszubildende_id", id)
      .order("purchased_at", { ascending: false, nullsFirst: false }),
  ]);

  // Pull all reviews tied to this contact's bookings. Review rows live
  // under booking_id, which is FK'd to course_bookings — we already have
  // the full list above, so we can scope cheaply by booking_id IN(...).
  const bookingIds = (bookings ?? []).map((b) => b.id);
  const { data: reviews } = bookingIds.length
    ? await supabase
        .from("course_reviews")
        .select(
          `id, rating, first_name, body_text, internal_feedback,
           is_published, submitted_at, published_at, booking_id, template_id,
           course_templates:template_id ( title, course_label_de )`,
        )
        .in("booking_id", bookingIds)
        .order("submitted_at", { ascending: false })
    : { data: [] };

  return (
    <AuszubildendeDetail
      azubi={azubi}
      bookings={bookings ?? []}
      legacyBookings={legacyBookings ?? []}
      reviews={reviews ?? []}
      isAdmin={isAdmin}
    />
  );
}
