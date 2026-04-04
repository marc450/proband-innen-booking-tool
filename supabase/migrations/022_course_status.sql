-- Add status column to courses table
-- 'online' = accepting bookings, 'offline' = not visible in public funnel
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'online'
  CHECK (status IN ('online', 'offline'));

-- Backfill: mark any course whose date is today or earlier as offline
UPDATE courses
SET status = 'offline'
WHERE course_date IS NOT NULL
  AND course_date::date <= CURRENT_DATE;
