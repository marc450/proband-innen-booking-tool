-- 086_lms_chapter3_lernziele.sql
-- Add chapter 3 "Behandlung der Glabella" + its first lesson
-- "Lernziele". Mirrors the chapter 2 Lernziele structure: brown1
-- intro question, statement heading, three check-variant bullets,
-- closing motivationBlock with the SMILE message (with exclamation
-- marks per the migration 081 update).
--
-- Idempotent: ON CONFLICT DO NOTHING on chapter and lesson rows.

BEGIN;

-- Chapter 3.
WITH c AS (
  SELECT id FROM public.lms_courses WHERE slug = 'kostenloses-botox-tutorial'
)
INSERT INTO public.lms_chapters
  (course_id, slug, title, order_index, is_published)
SELECT c.id, 'behandlung-der-glabella', 'Behandlung der Glabella', 2, true FROM c
ON CONFLICT (course_id, slug) DO NOTHING;

-- Lesson 3.1: Lernziele.
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
  'lernziele',
  'Lernziele',
  'text',
  17,
  $json${
    "type": "doc",
    "content": [
      {
        "type": "heading",
        "attrs": { "level": 3, "variant": "brown1" },
        "content": [{ "type": "text", "text": "Was erwartet Dich in dem Kapitel Behandlung der Glabella?" }]
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
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "die Muskeln, die behandelt werden." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "anatomische Besonderheiten, die ich für eine gute Behandlung wissen muss." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "die Dosierungen für verschiedene Präparate in dieser Zone." }] }] }
        ]
      },
      {
        "type": "motivationBlock",
        "attrs": { "message": "SMILE! You are on your way becoming a fantastic doctor!" }
      }
    ]
  }$json$::jsonb,
  0,
  true
FROM ch
ON CONFLICT (chapter_id, slug) DO NOTHING;

COMMIT;
