-- 072_courses_instructor_id.sql
-- Phase 1 of the instructor FK refactor: add instructor_id columns on
-- courses and course_templates pointing at profiles, and backfill
-- courses by matching the existing free-text name against profiles
-- where is_dozent=true. course_templates.instructor is empty in
-- production, so no backfill is needed there. Phase 2 (after the code
-- migration deploys) drops the legacy text columns.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS instructor_id uuid REFERENCES public.profiles(id);

ALTER TABLE public.course_templates
  ADD COLUMN IF NOT EXISTS instructor_id uuid REFERENCES public.profiles(id);

UPDATE public.courses c
SET instructor_id = p.id
FROM public.profiles p
WHERE p.is_dozent = true
  AND TRIM(CONCAT(COALESCE(p.title || ' ', ''), p.first_name, ' ', p.last_name)) = c.instructor
  AND c.instructor_id IS NULL
  AND c.instructor IS NOT NULL
  AND c.instructor <> '';

CREATE INDEX IF NOT EXISTS courses_instructor_id_idx
  ON public.courses(instructor_id);

CREATE INDEX IF NOT EXISTS course_templates_instructor_id_idx
  ON public.course_templates(instructor_id);
