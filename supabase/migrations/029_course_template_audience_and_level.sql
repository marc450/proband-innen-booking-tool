-- Add structured audience + level fields to course_templates so the marketing
-- pills ("Für Humanmediziner:innen" / "Für Zahnmediziner:innen" +
-- "Für Einsteiger:innen" / "Für Fortgeschrittene") stop being string-matched
-- out of the course title and instead come from real data.
--
-- `audience`  values: 'humanmediziner' | 'zahnmediziner' | 'alle' | null
-- `level`     values: 'einsteiger'    | 'fortgeschritten' | null
--
-- All existing rows are backfilled to 'humanmediziner' as a safe default;
-- Marc will flip the one Zahnmediziner course in the admin afterwards.

ALTER TABLE course_templates
  ADD COLUMN IF NOT EXISTS audience text,
  ADD COLUMN IF NOT EXISTS level text;

UPDATE course_templates
SET audience = 'humanmediziner'
WHERE audience IS NULL;
