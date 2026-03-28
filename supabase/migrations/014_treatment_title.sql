-- Add treatment_title to course_templates and courses
-- This is the customer-facing name (e.g., "Behandlung mimischer Falten mit Botulinum")
-- while title remains the internal course name (e.g., "Grundkurs Botulinum")

ALTER TABLE course_templates ADD COLUMN IF NOT EXISTS treatment_title text;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS treatment_title text;

-- Update available_slots view to include treatment_title
DROP VIEW IF EXISTS available_slots;
CREATE OR REPLACE VIEW available_slots AS
SELECT
  s.id,
  s.course_id,
  s.start_time,
  s.end_time,
  s.capacity,
  s.created_at,
  COALESCE(c.treatment_title, c.title) as course_title,
  c.description as course_description,
  c.course_date,
  s.capacity - COALESCE(
    (SELECT count(*) FROM bookings b
     WHERE b.slot_id = s.id AND b.status IN ('booked', 'attended')),
    0
  ) as remaining_capacity
FROM slots s
JOIN courses c ON c.id = s.course_id;

GRANT SELECT ON available_slots TO anon, authenticated;
