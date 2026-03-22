-- Add course_date to courses table
alter table courses add column course_date date;

-- Make end_time nullable in slots (no longer required)
alter table slots alter column end_time drop not null;
