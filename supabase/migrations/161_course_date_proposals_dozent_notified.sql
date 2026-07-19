-- Slack-DM idempotency stamp for the Dozent:innen "neue offene Termine"
-- notification. The daily sweep (/api/send-reminders → runDozentSlot
-- Notifications) DMs every Dozent:in once per newly opened proposal and
-- stamps this column so a later run never re-notifies the same slot.

alter table public.course_date_proposals
  add column if not exists dozent_notified_at timestamptz;

comment on column public.course_date_proposals.dozent_notified_at is
  'Set by the daily sweep when Dozent:innen were Slack-DMed about this open slot. Null = not yet notified.';

-- Partial index: the sweep only ever scans open, un-notified proposals.
create index if not exists idx_course_date_proposals_unnotified
  on public.course_date_proposals (proposed_date)
  where status = 'open' and dozent_notified_at is null;
