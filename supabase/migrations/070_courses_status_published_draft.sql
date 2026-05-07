-- 070_courses_status_published_draft.sql
-- Rename courses.status values from the misleading 'online'/'offline'
-- (which collide with the Auszubildende course-type labels) to the
-- clearer 'published'/'draft'. Single transaction so no row is ever
-- left between states.

BEGIN;

-- Drop the existing CHECK so the UPDATE can run.
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_status_check;

-- Migrate values.
UPDATE public.courses
SET status = CASE status
  WHEN 'online'  THEN 'published'
  WHEN 'offline' THEN 'draft'
  ELSE status
END;

-- Update the column default so newly-inserted courses come in as
-- 'published' (matches the previous behaviour where the default was
-- 'online' and courses appeared on the public list immediately).
ALTER TABLE public.courses ALTER COLUMN status SET DEFAULT 'published';

-- New CHECK with the new value set.
ALTER TABLE public.courses
  ADD CONSTRAINT courses_status_check
  CHECK (status IN ('published', 'draft'));

COMMIT;
