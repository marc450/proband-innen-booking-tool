-- Dozent:innen profiles
CREATE TABLE IF NOT EXISTS dozenten (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text, -- e.g. "Dr. med.", "Prof. Dr."
  first_name text NOT NULL,
  last_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Backfill from existing course_templates instructor field
-- (best-effort: puts the full string as last_name)
INSERT INTO dozenten (first_name, last_name)
SELECT DISTINCT '', instructor
FROM course_templates
WHERE instructor IS NOT NULL AND instructor != ''
ON CONFLICT DO NOTHING;
