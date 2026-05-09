-- 095_lms_quiz_timer_20s.sql
-- Lower the per-question timer on the Botox-Tutorial quiz from 30s
-- to 20s. Tighter window, less room for casual ChatGPT lookups while
-- still readable. Idempotent (sets a fixed value).

BEGIN;

UPDATE public.lms_lessons
SET body = jsonb_set(
  body,
  '{content,2,attrs,timePerQuestionSeconds}',
  '20'::jsonb
)
WHERE chapter_id = (
  SELECT ch.id FROM public.lms_chapters ch
  JOIN public.lms_courses co ON co.id = ch.course_id
  WHERE co.slug = 'kostenloses-botox-tutorial'
    AND ch.slug = 'teste-dein-wissen'
)
AND slug = 'mache-jetzt-den-test';

COMMIT;
