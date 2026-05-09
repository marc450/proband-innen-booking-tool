-- 097_lms_rename_course_slug.sql
-- Rename the free Botox tutorial:
--   slug:  kostenloses-botox-tutorial → kostenloser-botox-kurs
--   title: Kostenloses Botox Tutorial → Kostenloser Botox-Kurs
--
-- Matches the marketing page at ephia.de/kostenloser-botox-kurs.
-- Middleware on study.ephia.de adds a 301 redirect from the old
-- slug path tree to the new one for SEO continuity.
--
-- Idempotent: re-running just sets the same values.

BEGIN;

UPDATE public.lms_courses
SET slug  = 'kostenloser-botox-kurs',
    title = 'Kostenloser Botox-Kurs'
WHERE slug = 'kostenloses-botox-tutorial';

COMMIT;
