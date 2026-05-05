-- Drop dead success_url / cancel_url columns on course_templates.
--
-- These were added in migration 018 but never wired into any checkout
-- route. The actual Stripe success_url / cancel_url is hardcoded in
-- src/app/api/course-checkout/route.ts (always /courses/success on the
-- booking domain, cancel always https://ephia.de). Code cleanup
-- removed the dashboard form inputs that wrote to these columns.

ALTER TABLE course_templates DROP COLUMN IF EXISTS success_url_online;
ALTER TABLE course_templates DROP COLUMN IF EXISTS success_url_praxis;
ALTER TABLE course_templates DROP COLUMN IF EXISTS success_url_kombi;
ALTER TABLE course_templates DROP COLUMN IF EXISTS cancel_url_online;
ALTER TABLE course_templates DROP COLUMN IF EXISTS cancel_url_praxis;
ALTER TABLE course_templates DROP COLUMN IF EXISTS cancel_url_kombi;
