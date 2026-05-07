-- 064_enum_check_constraints.sql
-- Lock down two text columns that were acting as enums without any
-- constraint, so a typo or stray UI value can no longer slip past the
-- DB. Both columns currently hold only the canonical values, verified
-- before this migration.

-- course_sessions.cme_status: dropdown values from
-- src/app/dashboard/auszubildende/course-sessions-manager.tsx.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'course_sessions_cme_status_check'
  ) THEN
    ALTER TABLE public.course_sessions
      ADD CONSTRAINT course_sessions_cme_status_check
      CHECK (cme_status IS NULL OR cme_status IN (
        'Nicht beantragt',
        'LÄK Berlin',
        'LÄK Brandenburg',
        'Buchung auf anderen Kurs'
      ));
  END IF;
END $$;

-- course_bookings.audience_tag: written by stripe-webhook for new
-- purchases via course-checkout. NULL is valid (legacy rows and the
-- two unset rows from the early days of the new system).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'course_bookings_audience_tag_check'
  ) THEN
    ALTER TABLE public.course_bookings
      ADD CONSTRAINT course_bookings_audience_tag_check
      CHECK (audience_tag IS NULL OR audience_tag IN (
        'Humanmediziner:in',
        'Zahnmediziner:in'
      ));
  END IF;
END $$;
