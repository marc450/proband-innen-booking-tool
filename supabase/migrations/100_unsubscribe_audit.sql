-- 100_unsubscribe_audit.sql
--
-- Audit trail for the campaign opt-out flow.
--
-- The opt-out itself reuses the existing 'inactive' status value on
-- both patients.patient_status and auszubildende.status, since both
-- campaign-send paths already filter on it (see
-- src/app/api/send-campaign/route.ts:103,112,138). That alone is
-- enough to block future campaigns.
--
-- These timestamp columns exist purely for the GDPR audit trail
-- ("we honored their opt-out at <time>") and to distinguish "user
-- opted out via the email link" from "staff manually deactivated
-- this account". Cleared again on re-subscribe.

alter table public.patients
  add column if not exists unsubscribed_at timestamptz;

alter table public.auszubildende
  add column if not exists unsubscribed_at timestamptz;
