-- ============================================================================
-- One-time bulk review request to past course participants.
--
-- The rolling cron (scheduleCourseReviewEmails) only ever reaches bookings
-- whose course is about to end; it deliberately skips anything already in the
-- past. To ask past attendees for a review, a separate Marc-triggered pass
-- sends the same tokenized review email immediately.
--
-- This column is the idempotency marker for that pass: once a booking has been
-- bulk-emailed, it is set so a second click of the button never re-pings the
-- same person. It is independent of review_email_sent_at (set by the cron),
-- so the first bulk run still reaches cron non-responders.
-- ============================================================================

alter table public.course_bookings
  add column if not exists review_request_resent_at timestamptz;

comment on column public.course_bookings.review_request_resent_at is
  'Wall-clock time the one-time bulk review-request email was sent to this past attendee (Marc-triggered from /dashboard/auszubildende/bewertungen). NULL = not yet bulk-emailed. Independent of review_email_sent_at, which is the rolling cron marker.';
