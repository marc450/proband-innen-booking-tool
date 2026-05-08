-- 073_courses_session_link.sql
-- Wire up the long-missing relationship between Auszubildende course
-- sessions (the actual events) and Proband:innen courses (the patient
-- side of the same event). Until now they were maintained as parallel
-- rows by hand. After this migration, every existing courses row is
-- linked to its session, and the dashboard can auto-create the
-- satellite when a new session is created.
--
-- ON DELETE SET NULL because deleting a session shouldn't cascade
-- through to deleting bookings on the Proband:innen side; the
-- satellite goes orphan and admin can decide what to do.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS session_id uuid
    REFERENCES public.course_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS courses_session_id_idx
  ON public.courses(session_id);

-- Backfill: every (template_id, course_date) pair that resolves to
-- exactly one course_sessions row gets linked. All 10 existing
-- courses rows are unambiguous (verified pre-migration), so this
-- finishes the full backfill in one shot.
WITH unique_pairs AS (
  SELECT
    c.id AS course_id,
    (array_agg(s.id))[1] AS session_id
  FROM public.courses c
  JOIN public.course_sessions s
    ON s.template_id = c.template_id AND s.date_iso = c.course_date
  WHERE c.session_id IS NULL
  GROUP BY c.id
  HAVING COUNT(s.id) = 1
)
UPDATE public.courses c
SET session_id = up.session_id
FROM unique_pairs up
WHERE c.id = up.course_id;
