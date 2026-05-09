-- 083_lms_diskriminierung_think_callout.sql
-- Convert the "Ein Mangel an Inklusion …"-paragraph in the
-- Diskriminierung lesson into a `think`-variant callout (signal blue
-- box with a lightbulb icon), matching the LearnWorlds reference.
--
-- Renderer support added in src/lib/lms/renderer.tsx for callout
-- variant "think" with a Lightbulb icon prefix.
--
-- Idempotent: re-running just sets content[9] to the same value.

BEGIN;

UPDATE public.lms_lessons
SET body = jsonb_set(
  body,
  '{content,9}',
  $json${
    "type": "callout",
    "attrs": { "variant": "think" },
    "content": [
      { "type": "paragraph", "content": [{ "type": "text", "text": "Ein Mangel an Inklusion in der Forschung hält immer noch eine gesundheitliche Ungleichheiten aufrecht, was eine direkte Herausforderung für medizinisches Personal darstellt, weil Evidenz für eine gleichberechtigte Behandlung fehlt." }] }
    ]
  }$json$::jsonb
)
WHERE chapter_id = (
  SELECT ch.id FROM public.lms_chapters ch
  JOIN public.lms_courses co ON co.id = ch.course_id
  WHERE co.slug = 'kostenloses-botox-tutorial'
    AND ch.slug = 'schoenheitsideale-und-hintergruende'
)
AND slug = 'diskriminierung-in-der-aesthetischen-medizin';

COMMIT;
