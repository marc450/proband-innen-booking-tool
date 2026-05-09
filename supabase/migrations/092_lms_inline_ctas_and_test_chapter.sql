-- 092_lms_inline_ctas_and_test_chapter.sql
-- Three structural changes:
--
-- 1. Drop the Grundkurs-CTA lesson (was a dedicated "promo page" in
--    chapter 4) and rename chapter 4 to "Teste Dein Wissen". The
--    Quiz lesson stays and becomes the only lesson of that chapter.
--
-- 2. Inline CTA section (brown1 heading + paragraph + ctaButton) is
--    inserted into each of the four main long-form text lessons so
--    the "next step → Grundkurs Botulinum" promotion appears
--    throughout the text rather than as a single end-of-tutorial
--    chapter:
--      - Welcome lesson — appended at the end (no Literaturverzeichnis).
--      - Vielfalt lesson — inserted after the summaryBand, before the
--        Literaturverzeichnis heading.
--      - Diskriminierung lesson — same placement.
--      - Behandlung der Glabella lesson — same placement.
--
-- 3. Citation superscript rendering is renderer-level (no body
--    changes); see src/lib/lms/renderer.tsx.
--
-- Idempotent: re-running the deletes is safe (already gone), and the
-- inline-CTA inserts append/insert at known positions but use the
-- jsonb path arithmetic below; running twice would duplicate CTA
-- cards. Only run once.

BEGIN;

-- ─── 1. Cleanup chapter 4 ────────────────────────────────────────
-- Delete the Grundkurs CTA lesson (the Quiz stays).
DELETE FROM public.lms_lessons
WHERE chapter_id = (
  SELECT ch.id FROM public.lms_chapters ch
  JOIN public.lms_courses co ON co.id = ch.course_id
  WHERE co.slug = 'kostenloses-botox-tutorial'
    AND ch.slug = 'lerne-mehr-ueber-botulinumbehandlungen'
)
AND slug = 'ephia-grundkurs-botulinum';

-- Rename chapter 4 (title + slug).
UPDATE public.lms_chapters
SET slug = 'teste-dein-wissen',
    title = 'Teste Dein Wissen'
WHERE course_id = (SELECT id FROM public.lms_courses WHERE slug = 'kostenloses-botox-tutorial')
  AND slug = 'lerne-mehr-ueber-botulinumbehandlungen';

-- Move the Quiz lesson to order_index 0 (it's the only lesson now).
UPDATE public.lms_lessons
SET order_index = 0
WHERE chapter_id = (
  SELECT ch.id FROM public.lms_chapters ch
  JOIN public.lms_courses co ON co.id = ch.course_id
  WHERE co.slug = 'kostenloses-botox-tutorial'
    AND ch.slug = 'teste-dein-wissen'
)
AND slug = 'mache-jetzt-den-test';

-- ─── 2. Inline CTA helper ────────────────────────────────────────
-- Temporary helper that inserts a jsonb array of nodes after a given
-- 0-based index in body.content. Pure SQL using array_position via
-- jsonb_array_elements + WITH ORDINALITY (1-indexed); we add 1 to
-- the caller's after_idx since ordinality is 1-based.
CREATE OR REPLACE FUNCTION pg_temp.insert_after(
  body jsonb,
  after_idx int,
  to_insert jsonb
) RETURNS jsonb AS $$
DECLARE
  arr      jsonb := body->'content';
  before_p jsonb;
  after_p  jsonb;
  cutoff   int   := after_idx + 1;
BEGIN
  before_p := COALESCE(
    (SELECT jsonb_agg(elem ORDER BY ord)
       FROM jsonb_array_elements(arr) WITH ORDINALITY AS t(elem, ord)
      WHERE ord <= cutoff),
    '[]'::jsonb
  );
  after_p := COALESCE(
    (SELECT jsonb_agg(elem ORDER BY ord)
       FROM jsonb_array_elements(arr) WITH ORDINALITY AS t(elem, ord)
      WHERE ord > cutoff),
    '[]'::jsonb
  );
  RETURN jsonb_set(body, '{content}', before_p || to_insert || after_p);
END;
$$ LANGUAGE plpgsql;

-- The CTA section that gets inserted (heading + paragraph + button).
-- Same content for all four lessons so the prompt is consistent.
CREATE OR REPLACE FUNCTION pg_temp.cta_section() RETURNS jsonb AS $$
  SELECT $json$[
    {
      "type": "heading",
      "attrs": { "level": 3, "variant": "brown1" },
      "content": [{ "type": "text", "text": "Vertiefe Dein Wissen" }]
    },
    {
      "type": "paragraph",
      "content": [{ "type": "text", "text": "Wenn Du systematisch lernen möchtest, wie Du Patient:innen verantwortungsvoll mit Botulinum behandelst, ist unser EPHIA Online-Grundkurs Botulinum der nächste Schritt. Anatomie, Indikationsstellung, Technik und Komplikationsmanagement, evidenzbasiert und mit echten Fallbeispielen." }]
    },
    {
      "type": "ctaButton",
      "attrs": {
        "label": "Zum Grundkurs Botulinum",
        "href": "https://ephia.de/grundkurs-botulinum"
      }
    }
  ]$json$::jsonb;
$$ LANGUAGE sql IMMUTABLE;

-- ─── 3. Insert CTA into each of the four main text lessons ───────

-- Welcome lesson — append at the end (no Literaturverzeichnis):
-- last index is 18 (paragraph "Indem wir auch unsere eigenen Fehler"),
-- insert after that.
UPDATE public.lms_lessons
SET body = pg_temp.insert_after(body, 18, pg_temp.cta_section())
WHERE chapter_id = (
  SELECT ch.id FROM public.lms_chapters ch
  JOIN public.lms_courses co ON co.id = ch.course_id
  WHERE co.slug = 'kostenloses-botox-tutorial'
    AND ch.slug = 'wir-freuen-uns-dass-du-dabei-bist'
)
AND slug = 'herzlich-willkommen';

-- Vielfalt lesson — after summaryBand at index 17, before the
-- Literaturverzeichnis heading at index 18.
UPDATE public.lms_lessons
SET body = pg_temp.insert_after(body, 17, pg_temp.cta_section())
WHERE chapter_id = (
  SELECT ch.id FROM public.lms_chapters ch
  JOIN public.lms_courses co ON co.id = ch.course_id
  WHERE co.slug = 'kostenloses-botox-tutorial'
    AND ch.slug = 'schoenheitsideale-und-hintergruende'
)
AND slug = 'vielfalt-in-der-aesthetischen-medizin';

-- Diskriminierung lesson — after summaryBand at index 20, before
-- the Literaturverzeichnis heading at index 21.
UPDATE public.lms_lessons
SET body = pg_temp.insert_after(body, 20, pg_temp.cta_section())
WHERE chapter_id = (
  SELECT ch.id FROM public.lms_chapters ch
  JOIN public.lms_courses co ON co.id = ch.course_id
  WHERE co.slug = 'kostenloses-botox-tutorial'
    AND ch.slug = 'schoenheitsideale-und-hintergruende'
)
AND slug = 'diskriminierung-in-der-aesthetischen-medizin';

-- Behandlung der Glabella lesson — after summaryBand at index 25,
-- before the Literaturverzeichnis heading at index 26.
UPDATE public.lms_lessons
SET body = pg_temp.insert_after(body, 25, pg_temp.cta_section())
WHERE chapter_id = (
  SELECT ch.id FROM public.lms_chapters ch
  JOIN public.lms_courses co ON co.id = ch.course_id
  WHERE co.slug = 'kostenloses-botox-tutorial'
    AND ch.slug = 'behandlung-der-glabella'
)
AND slug = 'behandlung-der-glabella';

COMMIT;
