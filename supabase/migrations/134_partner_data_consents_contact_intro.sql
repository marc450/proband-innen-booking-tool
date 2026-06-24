-- 134_partner_data_consents_contact_intro.sql
-- 24h after an Ärzt:in signs the Galderma consent, EPHIA sends them a
-- welcome email introducing their Galderma contact person (the
-- "überregionale Ansprechpartnerin"). This is a transactional email TO the
-- consenting doctor, not a data transfer to Galderma. The daily cron picks
-- up every active consent older than 24h that has not been introduced yet
-- and stamps contact_intro_sent_at so each doctor is introduced exactly once.

alter table public.partner_data_consents
  add column if not exists contact_intro_sent_at timestamptz; -- NULL = contact intro not yet sent

comment on column public.partner_data_consents.contact_intro_sent_at is
  'When the 24h-after-consent Galderma contact-intro email was sent to the doctor. NULL = not yet sent. Drives once-per-doctor idempotency for that email, independent of exported_at.';

-- The contact-intro selection scans this filter every cron run.
create index if not exists idx_partner_data_consents_contact_intro
  on public.partner_data_consents (partner, consented_at, revoked_at, contact_intro_sent_at);
