-- 081_lms_lernziele_smile_punctuation.sql
-- Replace the periods in the Lernziele motivationBlock message with
-- exclamation marks for a more upbeat tone.

BEGIN;

UPDATE public.lms_lessons
SET body = jsonb_set(
  body,
  '{content,3,attrs,message}',
  '"SMILE! You are on your way becoming a fantastic doctor!"'::jsonb
)
WHERE chapter_id = (
  SELECT ch.id FROM public.lms_chapters ch
  JOIN public.lms_courses co ON co.id = ch.course_id
  WHERE co.slug = 'kostenloses-botox-tutorial'
    AND ch.slug = 'schoenheitsideale-und-hintergruende'
)
AND slug = 'lernziele';

COMMIT;
