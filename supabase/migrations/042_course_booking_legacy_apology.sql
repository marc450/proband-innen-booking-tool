-- One-shot column for the legacy-apology email batch (2026-04-26).
--
-- Context: a manual test of the /api/send-reminders cron mistakenly
-- triggered the "Bitte vervollständige Dein Profil" email for 64
-- legacy-import doctors who had already received their course access
-- via the previous Lovable+Zapier ops setup. The email's wording
-- ("damit wir Deinen Kurs freischalten können") is wrong for them.
--
-- /api/send-legacy-apology iterates all course_bookings rows where
-- profile_reminder_sent = true AND legacy_import = true AND
-- legacy_apology_sent_at IS NULL, sends the apology, then stamps
-- legacy_apology_sent_at = now() so the route is idempotent and the
-- column keeps a record of who got notified and when.
--
-- The route is meant to be deleted once the batch has been sent. The
-- column stays as historical proof in case anyone replies confused.

ALTER TABLE public.course_bookings
  ADD COLUMN IF NOT EXISTS legacy_apology_sent_at timestamptz;
