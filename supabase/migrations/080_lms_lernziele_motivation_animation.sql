-- 080_lms_lernziele_motivation_animation.sql
-- Replace the static "And don't forget / SMILE" callout in the
-- chapter 2 Lernziele lesson with the new motivationBlock node, so
-- the same "you're on your way" message gets a bouncing smiley + a
-- few pulsing sparkles around it.
--
-- Idempotent: re-running just sets the body to the same value.

BEGIN;

UPDATE public.lms_lessons
SET body = $json${
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 3, "variant": "brown1" },
      "content": [{ "type": "text", "text": "Was erwartet Dich in dem Kapitel Schönheitsideale und Hintergründe?" }]
    },
    {
      "type": "heading",
      "attrs": { "level": 3 },
      "content": [{ "type": "text", "text": "Nach diesem Kapitel kenne ich ..." }]
    },
    {
      "type": "bulletList",
      "attrs": { "variant": "check" },
      "content": [
        { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "die Historische Entwicklung von Schönheitsbehandlungen." }] }] },
        { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Hintergründe zu Diskriminierung in der ästhetischen Medizin." }] }] },
        { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Einflüsse der Medien auf ästhetische Empfindungen." }] }] }
      ]
    },
    {
      "type": "motivationBlock",
      "attrs": { "message": "SMILE. You are on your way becoming a fantastic doctor." }
    }
  ]
}$json$::jsonb
WHERE chapter_id = (
  SELECT ch.id FROM public.lms_chapters ch
  JOIN public.lms_courses co ON co.id = ch.course_id
  WHERE co.slug = 'kostenloses-botox-tutorial'
    AND ch.slug = 'schoenheitsideale-und-hintergruende'
)
AND slug = 'lernziele';

COMMIT;
