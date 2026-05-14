-- 099_campaign_gmail_archive_status.sql
--
-- Adds Gmail-archive progress tracking to email_campaigns.
--
-- Background: sending a campaign used to block the staff member until
-- every recipient had been mirrored into the customerlove@ephia.de
-- Gmail Sent folder. That mirror is sequential (Gmail per-user quota
-- ~10 inserts/sec) and dominated the wait time at 400+ recipients.
--
-- send-campaign now returns as soon as Resend has accepted all batches
-- and runs the Gmail mirror in a detached after() callback. These
-- columns let the campaign detail view show whether the archive is
-- still running, done, partially failed, or fully failed without
-- staff having to tail Railway logs.
--
-- Status values:
--   null      → campaign not sent yet, or pre-migration legacy row
--   'skipped' → scheduled send; Resend will fire later, webhook handles archive
--   'pending' → archive loop is in progress
--   'done'    → all recipients archived successfully
--   'partial' → some recipients archived, some failed
--   'failed'  → catastrophic failure before per-recipient processing

alter table public.email_campaigns
  add column if not exists gmail_archive_status text
    check (gmail_archive_status in ('pending', 'done', 'partial', 'failed', 'skipped')),
  add column if not exists gmail_archive_progress int not null default 0,
  add column if not exists gmail_archive_total int not null default 0,
  add column if not exists gmail_archive_failed int not null default 0,
  add column if not exists gmail_archive_error text,
  add column if not exists gmail_archive_started_at timestamptz,
  add column if not exists gmail_archive_finished_at timestamptz;
