-- 048_archived_resend_ids.sql
-- Idempotency table for the Resend webhook archive flow.
--
-- Resend retries failed webhooks up to 16 times over 24 hours. Without
-- a dedup gate we'd insert the same message into customerlove's Gmail
-- Sent folder once per retry. The webhook handler does:
--
--   insert into archived_resend_ids (resend_id) values (...) on conflict do nothing returning resend_id
--
-- and only proceeds with archiveSentMessage when the row was inserted
-- (i.e. this is the first time we've seen this Resend message). The
-- table only ever grows by one row per scheduled-campaign recipient,
-- so storage is negligible (a 5k-recipient send adds ~250KB).

create table if not exists archived_resend_ids (
  resend_id text primary key,
  created_at timestamptz not null default now()
);

-- Service role writes only — no RLS needed for an internal log.
