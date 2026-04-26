-- Roll back the one-shot legacy-apology infrastructure built for the
-- 2026-04-26 incident. The /api/send-legacy-apology route, the dashboard
-- trigger button and the cron filter were all reverted in the same
-- commit. The column has served its idempotency role during the batch
-- and is now dropped to leave course_bookings clean.

ALTER TABLE public.course_bookings
  DROP COLUMN IF EXISTS legacy_apology_sent_at;
