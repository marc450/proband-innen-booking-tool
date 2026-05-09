-- 079_lms_chapter2_lernziele.sql
-- Add Chapter 2 ("Schönheitsideale & Hintergründe") to the free
-- Botox tutorial, plus its first lesson "Lernziele". Other lessons
-- in this chapter (Diskriminierung, Vielfalt, Arzt-Patient:innen-
-- Beziehung, Journal Club Ästhetik) come in subsequent migrations.
--
-- Renderer support added in src/lib/lms/renderer.tsx for:
--   * heading.attrs.variant = "brown1" → brown text colour
--   * bulletList.attrs.variant = "check" → checkmark icons instead of
--     disc bullets
--
-- Idempotent: ON CONFLICT DO NOTHING on the chapter and lesson rows.

BEGIN;

-- Chapter 2.
WITH c AS (
  SELECT id FROM public.lms_courses WHERE slug = 'kostenloses-botox-tutorial'
)
INSERT INTO public.lms_chapters
  (course_id, slug, title, order_index, is_published)
SELECT c.id, 'schoenheitsideale-und-hintergruende', 'Schönheitsideale & Hintergründe', 1, true FROM c
ON CONFLICT (course_id, slug) DO NOTHING;

-- Lesson 2.1: Lernziele.
WITH ch AS (
  SELECT ch.id FROM public.lms_chapters ch
  JOIN public.lms_courses co ON co.id = ch.course_id
  WHERE co.slug = 'kostenloses-botox-tutorial'
    AND ch.slug = 'schoenheitsideale-und-hintergruende'
)
INSERT INTO public.lms_lessons
  (chapter_id, slug, title, lesson_type, duration_seconds, body, order_index, is_published)
SELECT
  ch.id,
  'lernziele',
  'Lernziele',
  'text',
  15,
  $json${
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
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [{ "type": "text", "text": "And don't forget" }]
      },
      {
        "type": "callout",
        "attrs": { "variant": "signal" },
        "content": [
          { "type": "paragraph", "content": [{ "type": "text", "text": "SMILE. You are on your way becoming a fantastic doctor." }] }
        ]
      }
    ]
  }$json$::jsonb,
  0,
  true
FROM ch
ON CONFLICT (chapter_id, slug) DO NOTHING;

COMMIT;
