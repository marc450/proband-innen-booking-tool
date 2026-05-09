-- 088_lms_glabella_image_paths.sql
-- Fix the figure src URLs in the Behandlung-der-Glabella lesson:
-- the assets were uploaded to lms-images/free-botox-tutorial/...
-- but migration 087 referenced them at lms-images/... directly.
--
-- One REPLACE on the body cast to text, then cast back to jsonb.
-- Idempotent: after running once, the search pattern no longer
-- matches so re-running is a no-op.

BEGIN;

UPDATE public.lms_lessons
SET body = REPLACE(
  body::text,
  'lms-images/glabella-',
  'lms-images/free-botox-tutorial/glabella-'
)::jsonb
WHERE chapter_id = (
  SELECT ch.id FROM public.lms_chapters ch
  JOIN public.lms_courses co ON co.id = ch.course_id
  WHERE co.slug = 'kostenloses-botox-tutorial'
    AND ch.slug = 'behandlung-der-glabella'
)
AND slug = 'behandlung-der-glabella';

COMMIT;
