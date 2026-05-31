import { createAdminClient } from "@/lib/supabase/admin";
import { ProbandReviewsManager, type ProbandReviewRow } from "./proband-reviews-manager";

export const dynamic = "force-dynamic";

export default async function ProbandReviewsPage() {
  const supabase = createAdminClient();

  const { data: reviews } = await supabase
    .from("proband_reviews")
    .select(
      `id, rating, first_name, body_text,
       is_published, submitted_at, published_at, patient_id`,
    )
    .order("submitted_at", { ascending: false });

  const initial = (reviews ?? []) as ProbandReviewRow[];
  return <ProbandReviewsManager initialReviews={initial} />;
}
