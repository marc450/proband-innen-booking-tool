import { createAdminClient } from "@/lib/supabase/admin";
import {
  ReviewsManager,
  type ReviewRow,
  type InternalFeedbackByCourse,
} from "./reviews-manager";

export const dynamic = "force-dynamic";

const FEEDBACK_VISIBILITY_THRESHOLD = 2;

export default async function ReviewsPage() {
  const supabase = createAdminClient();

  // Public reviews — internal_feedback intentionally NOT selected; it
  // now lives in its own table (course_internal_feedback) to break the
  // identifiability link with the reviewer's first_name.
  const { data: reviews } = await supabase
    .from("course_reviews")
    .select(
      `id, rating, first_name, body_text,
       display_title, display_last_initial, is_imported,
       is_published, submitted_at, published_at,
       booking_id, template_id, auszubildende_id,
       course_bookings:booking_id (
         id, auszubildende_id, email, last_name,
         course_sessions ( date_iso, label_de ),
         auszubildende:auszubildende_id ( id, title, first_name, last_name )
       ),
       auszubildende:auszubildende_id ( id, title, first_name, last_name ),
       course_templates:template_id ( title, course_label_de )`,
    )
    .order("submitted_at", { ascending: false });

  // Anonymous team feedback, fetched independently. No join, no
  // booking link — by design.
  const { data: feedbackRows } = await supabase
    .from("course_internal_feedback")
    .select(
      `id, body, date_received, template_id,
       course_templates:template_id ( title, course_label_de )`,
    )
    .order("date_received", { ascending: false });

  // Anti-correlation threshold: only show feedback for a course once at
  // least N entries exist for that course. If a brand-new review and a
  // brand-new feedback both arrive on the same day, the admin couldn't
  // ship the feedback alongside the review (it stays hidden until a
  // second feedback for that course arrives). The threshold is
  // FEEDBACK_VISIBILITY_THRESHOLD; "show only once we have ≥2" matches
  // the privacy-design call we made on the bewertung flow.
  type Row = {
    id: string;
    body: string;
    date_received: string;
    template_id: string;
    course_templates:
      | { title: string | null; course_label_de: string | null }
      | { title: string | null; course_label_de: string | null }[]
      | null;
  };

  const countByTemplate = new Map<string, number>();
  for (const r of (feedbackRows ?? []) as Row[]) {
    countByTemplate.set(r.template_id, (countByTemplate.get(r.template_id) ?? 0) + 1);
  }

  // Group surviving rows by template, shuffle within each template so
  // chronological order doesn't leak who-said-what when the admin
  // happens to know which doctor attended which day.
  const grouped = new Map<string, InternalFeedbackByCourse>();
  for (const r of (feedbackRows ?? []) as Row[]) {
    if ((countByTemplate.get(r.template_id) ?? 0) < FEEDBACK_VISIBILITY_THRESHOLD) continue;
    const tpl = Array.isArray(r.course_templates) ? r.course_templates[0] : r.course_templates;
    const key = r.template_id;
    if (!grouped.has(key)) {
      grouped.set(key, {
        templateId: r.template_id,
        courseTitle: tpl?.course_label_de || tpl?.title || "Kurs",
        items: [],
      });
    }
    grouped.get(key)!.items.push({
      id: r.id,
      body: r.body,
      dateReceived: r.date_received,
    });
  }
  for (const group of grouped.values()) {
    // Fisher-Yates shuffle so insertion order isn't preserved.
    for (let i = group.items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [group.items[i], group.items[j]] = [group.items[j], group.items[i]];
    }
  }
  const feedbackByCourse = Array.from(grouped.values()).sort((a, b) =>
    a.courseTitle.localeCompare(b.courseTitle),
  );

  const initial = (reviews ?? []) as unknown as ReviewRow[];
  return (
    <ReviewsManager
      initialReviews={initial}
      initialFeedback={feedbackByCourse}
      feedbackThreshold={FEEDBACK_VISIBILITY_THRESHOLD}
    />
  );
}
