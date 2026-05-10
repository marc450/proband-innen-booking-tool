-- 099_course_internal_feedback.sql
-- Make the "Anonymes Team-Feedback" actually anonymous by storing it in
-- its own table with no FK to the booking and no doctor identity. The
-- previous design kept internal_feedback as a column on course_reviews,
-- which meant the row was always identifiable by booking_id + first_name
-- in the admin panel and on direct SQL access — anonymity was a UI
-- promise rather than a structural one.
--
-- Anonymity is achieved here by:
--   1. No booking_id and no first_name on the new table.
--   2. Day-level date instead of a sub-second timestamp, so the
--      moment-of-submission can't be correlated with a parallel public
--      review by ordering.
--   3. RLS with no anon / authenticated read policies; only the service
--      role (admin client) can read or write. Anonymous insert happens
--      via the same /api/submit-review handler that uses the admin
--      client, so callers can't see each other's feedback.
--   4. The admin UI applies a "show only when >= 2 entries exist for
--      this template" threshold so a single feedback can't be 1:1
--      correlated with a same-day single review. That logic lives in
--      the loader, not the schema.

create table if not exists public.course_internal_feedback (
  id            uuid primary key default gen_random_uuid(),
  template_id   uuid not null references public.course_templates(id) on delete cascade,
  body          text not null check (length(trim(body)) > 0),
  -- Day-level. Sub-day precision would defeat point 2 above.
  date_received date not null default current_date
);

create index if not exists idx_course_internal_feedback_template
  on public.course_internal_feedback (template_id, date_received desc);

alter table public.course_internal_feedback enable row level security;
-- No anon / authenticated SELECT or INSERT policies; service role
-- bypasses RLS. /api/submit-review uses the admin client to insert.

-- One-time cleanup: drop any leftover synthetic row from the dev probe
-- (POST /api/admin/probe-bewertung) so it doesn't get carried into the
-- new anonymous table by the data migration below. CASCADE clears the
-- probe's course_reviews row too.
delete from public.course_bookings
where email = 'bewertung-probe@ephia.de'
  and first_name = 'BewertungProbe';

-- Migrate any existing rows out of course_reviews.internal_feedback
-- into the new table, downgrading the timestamp to a plain date so
-- ordering can't leak identity.
insert into public.course_internal_feedback (template_id, body, date_received)
select template_id, internal_feedback, submitted_at::date
from public.course_reviews
where internal_feedback is not null
  and length(trim(internal_feedback)) > 0;

alter table public.course_reviews drop column if exists internal_feedback;
