-- Persist the exact list of recipient email addresses on each sent campaign so
-- staff can audit who a campaign was delivered to. Stored as a plaintext array
-- (not encrypted) because the list is only accessible via dashboard (RLS).
alter table email_campaigns
  add column if not exists recipient_emails text[] default '{}'::text[];
