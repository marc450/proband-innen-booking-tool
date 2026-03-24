-- Add location field to courses table
alter table courses add column if not exists location text;
