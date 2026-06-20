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

  const [
    { data: bookings },
    { data: legacyBookings },
    { data: emailRows },
  ] = await Promise.all([
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
    // Pull every alias address attached to this contact so EmailHistory
    // can also surface threads from a previously merged-in profile, not
    // just the current primary.
    supabase
      .from("auszubildende_emails")
      .select("email")
      .eq("auszubildende_id", id),
  ]);

  const primary = (azubi.email || "").toLowerCase();
  const emailAliases = (emailRows ?? [])
    .map((r: { email: string | null }) => (r.email || "").toLowerCase())
    .filter((e: string) => e && e !== primary);

  // Pull all reviews tied to this contact's bookings. Review rows live
  // under booking_id, which is FK'd to course_bookings — we already have
  // the full list above, so we can scope cheaply by booking_id IN(...).
  const bookingIds = (bookings ?? []).map((b) => b.id);
  const [{ data: reviews }, { data: consentRows }] = await Promise.all([
    bookingIds.length
      ? supabase
          .from("course_reviews")
          .select(
            `id, rating, first_name, body_text, internal_feedback,
             is_published, submitted_at, published_at, booking_id, template_id,
             course_templates:template_id ( title, course_label_de )`,
          )
          .in("booking_id", bookingIds)
          .order("submitted_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    bookingIds.length
      ? supabase
          .from("partner_data_consents")
          .select("id, consented_at, revoked_at, exported_at, signed_payload")
          .eq("partner", "galderma")
          .in("course_booking_id", bookingIds)
          .order("consented_at", { ascending: false, nullsFirst: false })
      : Promise.resolve({ data: [] }),
  ]);

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
    <AuszubildendeDetail
      azubi={azubi}
      emailAliases={emailAliases}
      bookings={bookings ?? []}
      legacyBookings={legacyBookings ?? []}
      reviews={reviews ?? []}
      partnerConsents={partnerConsents}
      isAdmin={isAdmin}
    />
  );
}
