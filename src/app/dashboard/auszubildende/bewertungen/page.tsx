import { createAdminClient } from "@/lib/supabase/admin";
import { ReviewsManager, type ReviewRow } from "./reviews-manager";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const supabase = createAdminClient();

  const { data: reviews } = await supabase
    .from("course_reviews")
    .select(
      `id, rating, first_name, body_text, internal_feedback,
       is_published, submitted_at, published_at,
       booking_id, template_id,
       course_bookings:booking_id (
         id, auszubildende_id, email, last_name,
         course_sessions ( date_iso, label_de ),
         auszubildende:auszubildende_id ( id, title, first_name, last_name )
       ),
       course_templates:template_id ( title, course_label_de )`,
    )
    .order("submitted_at", { ascending: false });

  // Supabase generates row types from the schema; cast through `unknown` to
  // the locally declared shape since the generated types don't carry our
  // refined Joined<T> unions for the embedded relations.
  const initial = (reviews ?? []) as unknown as ReviewRow[];
  return <ReviewsManager initialReviews={initial} />;
}
