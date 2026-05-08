-- 074_session_satellite_cascade_and_sync.sql
-- Two follow-ups to the courses ↔ course_sessions linkage in 073:
--
-- 1. Change the FK from ON DELETE SET NULL to ON DELETE CASCADE so a
--    deleted session takes its (empty) satellite with it. If the
--    satellite has slots attached, the delete fails at the slot FK
--    rather than orphaning data — that's the desired safety net.
-- 2. Trigger that mirrors the two satellite fields admin actually
--    edits on the session side: date_iso → course_date, address →
--    location. Other fields (instructor, status, slot times) stay
--    independent and are owned by the courses-manager UI.

ALTER TABLE public.courses
  DROP CONSTRAINT IF EXISTS courses_session_id_fkey;

ALTER TABLE public.courses
  ADD CONSTRAINT courses_session_id_fkey
  FOREIGN KEY (session_id)
  REFERENCES public.course_sessions(id)
  ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.sync_session_to_courses()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.date_iso IS DISTINCT FROM NEW.date_iso
     OR OLD.address IS DISTINCT FROM NEW.address THEN
    UPDATE public.courses
       SET course_date = NEW.date_iso,
           location    = NEW.address
     WHERE session_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_session_to_courses
  ON public.course_sessions;

CREATE TRIGGER trg_sync_session_to_courses
  AFTER UPDATE OF date_iso, address ON public.course_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_session_to_courses();
