-- Idempotency marker for the post-praxis certificate email. Set by the
-- cron once the email with the rendered certificate PDF has been sent;
-- checked before each send so re-runs never duplicate.
alter table public.course_bookings
  add column if not exists cert_sent_at timestamptz;

comment on column public.course_bookings.cert_sent_at is
  'When the post-praxis certificate email was sent to this booking. NULL = not yet sent.';
