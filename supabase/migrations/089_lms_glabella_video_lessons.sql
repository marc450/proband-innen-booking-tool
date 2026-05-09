-- 089_lms_glabella_video_lessons.sql
-- Add the two video lessons in chapter 3 (Behandlung der Glabella)
-- after the text-only "Behandlung der Glabella"-lesson:
--   * order_index 2: Anzeichnen der Glabella bei Amanda (06:42)
--   * order_index 3: Injektion der Glabella bei Amanda  (02:32)
--
-- cf_stream_video_id is NULL on first seed; the reader renders a
-- "Video wird vorbereitet" placeholder until the video is uploaded
-- to Cloudflare Stream and the body's cfStreamVideoId attr is set
-- (jsonb_set on '{content,0,attrs,cfStreamVideoId}').

BEGIN;

WITH ch AS (
  SELECT ch.id FROM public.lms_chapters ch
  JOIN public.lms_courses co ON co.id = ch.course_id
  WHERE co.slug = 'kostenloses-botox-tutorial'
    AND ch.slug = 'behandlung-der-glabella'
)
INSERT INTO public.lms_lessons
  (chapter_id, slug, title, lesson_type, duration_seconds, body, order_index, is_published)
SELECT
  ch.id,
  'anzeichnen-der-glabella-bei-amanda',
  'Anzeichnen der Glabella bei Amanda',
  'video',
  402,
  '{"type":"doc","content":[{"type":"video","attrs":{"cfStreamVideoId":null}}]}'::jsonb,
  2,
  true
FROM ch
ON CONFLICT (chapter_id, slug) DO NOTHING;

WITH ch AS (
  SELECT ch.id FROM public.lms_chapters ch
  JOIN public.lms_courses co ON co.id = ch.course_id
  WHERE co.slug = 'kostenloses-botox-tutorial'
    AND ch.slug = 'behandlung-der-glabella'
)
INSERT INTO public.lms_lessons
  (chapter_id, slug, title, lesson_type, duration_seconds, body, order_index, is_published)
SELECT
  ch.id,
  'injektion-der-glabella-bei-amanda',
  'Injektion der Glabella bei Amanda',
  'video',
  152,
  '{"type":"doc","content":[{"type":"video","attrs":{"cfStreamVideoId":null}}]}'::jsonb,
  3,
  true
FROM ch
ON CONFLICT (chapter_id, slug) DO NOTHING;

COMMIT;
