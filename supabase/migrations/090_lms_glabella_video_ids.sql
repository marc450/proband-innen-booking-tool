-- 090_lms_glabella_video_ids.sql
-- Wire the Cloudflare Stream UIDs into the two glabella video
-- lessons added in migration 089.
--
-- Idempotent: jsonb_set on the cfStreamVideoId attr; re-running just
-- sets the same value.

BEGIN;

UPDATE public.lms_lessons
SET body = jsonb_set(
  body,
  '{content,0,attrs,cfStreamVideoId}',
  '"f534c63d1bf4b5e2eac6d1fd59c0d50d"'::jsonb
)
WHERE chapter_id = (
  SELECT ch.id FROM public.lms_chapters ch
  JOIN public.lms_courses co ON co.id = ch.course_id
  WHERE co.slug = 'kostenloses-botox-tutorial'
    AND ch.slug = 'behandlung-der-glabella'
)
AND slug = 'anzeichnen-der-glabella-bei-amanda';

UPDATE public.lms_lessons
SET body = jsonb_set(
  body,
  '{content,0,attrs,cfStreamVideoId}',
  '"e5cbf785d9ecb3eb27bfa73d50185234"'::jsonb
)
WHERE chapter_id = (
  SELECT ch.id FROM public.lms_chapters ch
  JOIN public.lms_courses co ON co.id = ch.course_id
  WHERE co.slug = 'kostenloses-botox-tutorial'
    AND ch.slug = 'behandlung-der-glabella'
)
AND slug = 'injektion-der-glabella-bei-amanda';

COMMIT;
