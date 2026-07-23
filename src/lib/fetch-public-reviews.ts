import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicReview } from "@/app/kurse/_components/sections/reviews";

// Shared loader for the published Ärzt:innen reviews. Used by the
// botox course landing (SERP rich-results test) and the home page
// review carousel. Surfaces ALL published reviews (not just the ones
// tied to one template) so the carousel reads cross-course feedback as
// one trust signal.
//
// Display name composition: first_name comes from the review itself
// (the doctor typed it on the form, signalling intent to publish),
// while title + last-name initial are derived from the linked
// auszubildende record. Cards fall back to first_name only when no
// auszubildende row is linked. The course_template join gives each card
// a "Bewertung zum Kurs X" line so readers know which course was rated.
type ReviewRow = {
  id: string;
  rating: number;
  first_name: string;
  body_text: string | null;
  submitted_at: string;
  is_pinned: boolean | null;
  is_imported: boolean | null;
  booking_id: string | null;
  auszubildende_id: string | null;
  display_title: string | null;
  display_last_initial: string | null;
  course_bookings:
    | {
        auszubildende:
          | { title: string | null; last_name: string | null }
          | { title: string | null; last_name: string | null }[]
          | null;
      }
    | {
        auszubildende:
          | { title: string | null; last_name: string | null }
          | { title: string | null; last_name: string | null }[]
          | null;
      }[]
    | null;
  auszubildende:
    | { title: string | null; last_name: string | null }
    | { title: string | null; last_name: string | null }[]
    | null;
  course_templates:
    | { course_label_de: string | null; title: string | null }
    | { course_label_de: string | null; title: string | null }[]
    | null;
};

export async function fetchPublicReviews(
  supabase: SupabaseClient,
  // When set, a course landing surfaces THIS course's own reviews plus
  // the shared pool of course-agnostic "general" reviews
  // (template_id IS NULL) that reads as cross-course trust and appears
  // on every landing. Omit it (home page) to get every published review.
  templateId?: string,
): Promise<PublicReview[]> {
  let query = supabase
    .from("course_reviews")
    .select(
      `id, rating, first_name, body_text, submitted_at, is_pinned, is_imported,
       booking_id, auszubildende_id,
       display_title, display_last_initial,
       course_bookings:booking_id (
         auszubildende:auszubildende_id ( title, last_name )
       ),
       auszubildende:auszubildende_id ( title, last_name ),
       course_templates:template_id ( course_label_de, title )`,
    )
    .eq("is_published", true);

  if (templateId) {
    query = query.or(`template_id.eq.${templateId},template_id.is.null`);
  }

  const { data: reviewRows } = await query
    .order("is_pinned", { ascending: false })
    .order("submitted_at", { ascending: false });

  return ((reviewRows ?? []) as ReviewRow[]).map((r) => {
    const tpl = Array.isArray(r.course_templates)
      ? r.course_templates[0]
      : r.course_templates;
    const booking = Array.isArray(r.course_bookings)
      ? r.course_bookings[0]
      : r.course_bookings;
    // Doctor comes from the booking when present, otherwise from the
    // doctor-anchored auszubildende join (one-time bulk pass reviews
    // have no booking link).
    const directAzubi = Array.isArray(r.auszubildende)
      ? r.auszubildende[0]
      : r.auszubildende;
    const azubi =
      (booking
        ? Array.isArray(booking.auszubildende)
          ? booking.auszubildende[0]
          : booking.auszubildende
        : null) ?? directAzubi;
    // Single-letter, uppercase, A-Z + umlauts only. Anything weirder
    // (e.g. last_name starts with a digit) is dropped to NULL so the
    // displayed line stays clean.
    const azubiRawInitial =
      azubi?.last_name?.trim().charAt(0).toUpperCase() ?? "";
    const azubiInitial = /^[A-ZÄÖÜ]$/.test(azubiRawInitial)
      ? azubiRawInitial
      : null;
    // Cascade: prefer the auszubildende-derived values (they're
    // canonical for the doctor's booking record), fall back to the
    // manually-set display_* columns for imported testimonials that
    // have no booking link.
    const title = azubi?.title?.trim() || r.display_title?.trim() || null;
    const lastInitial =
      azubiInitial || r.display_last_initial?.trim().toUpperCase() || null;
    return {
      id: r.id,
      rating: r.rating,
      firstName: r.first_name,
      title,
      lastInitial,
      bodyText: r.body_text,
      submittedAt: r.submitted_at,
      isPinned: r.is_pinned ?? false,
      isImported: r.is_imported ?? false,
      // Traceable to a booking, or to the doctor the review request was
      // sent to. The bulk-imported Testimonials have neither.
      verified: !!(r.booking_id || r.auszubildende_id),
      courseLabel: tpl?.course_label_de || tpl?.title || null,
    };
  });
}
