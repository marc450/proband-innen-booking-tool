-- Remove "freiberuflich" from all treatment descriptions.
--
-- Every affected row contains the exact fragment
--   "approbierte:n, freiberuflich tätige:n Ärzt:in"
-- which should read
--   "approbierte:n Ärzt:in"
-- so we strip the ", freiberuflich tätige:n" fragment in place. This is a
-- pure content update, no schema change. Idempotent: re-running is a no-op
-- once the fragment is gone.
--
-- Affects course_templates (5 rows) and courses (27 rows) as of 2026-06-08.

update public.course_templates
set service_description = replace(service_description, ', freiberuflich tätige:n', '')
where service_description like '%freiberuflich%';

update public.courses
set service_description = replace(service_description, ', freiberuflich tätige:n', '')
where service_description like '%freiberuflich%';
