-- 060_course_sessions_start_time_format.sql
-- course_sessions.start_time is text (not time). All consumers assume the
-- "HH:MM" format (string equality filters, lexical sort, .split(":") for
-- end-time math). Lock the format down with a CHECK so nobody ever writes
-- "morgens" or "10-12" by hand. Switching to a real time type would force
-- a wire-format refactor across the dashboard for no real gain since
-- nothing in the app does actual time math on this column.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'course_sessions_start_time_format'
  ) THEN
    ALTER TABLE public.course_sessions
      ADD CONSTRAINT course_sessions_start_time_format
      CHECK (start_time IS NULL OR start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
  END IF;
END $$;
