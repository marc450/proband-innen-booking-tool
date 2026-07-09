-- 142_lms_course_kind.sql
-- Adds a designation to LMS courses so the Lernzentrum can hold two
-- structurally identical but separately published content types:
--   * 'course'         — regular study.ephia.de course (existing behaviour)
--   * 'cme_fallstudie' — free CME case study, destined for its own public
--                        page (ephia.de/cme-fallbeispiele). Authored with
--                        the same chapters/lessons editor as a course.
--
-- Designation only: this migration does NOT change any public routing.
-- The reader keeps serving courses by slug; surfacing CME-Fallstudien on
-- their own page is a follow-up.

BEGIN;

ALTER TABLE public.lms_courses
  ADD COLUMN IF NOT EXISTS course_kind text NOT NULL DEFAULT 'course'
    CHECK (course_kind IN ('course', 'cme_fallstudie'));

COMMIT;
