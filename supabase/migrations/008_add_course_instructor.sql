-- Add instructor field to courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS instructor text;
