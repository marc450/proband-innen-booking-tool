-- 146_blocked_senders.sql
-- Sender blocklist for the customerlove@ephia.de inbox.
--
-- The inbox is Gmail-backed (live reads, no local message store), so we can
-- never stop a spammer from *sending* to the mailbox. "Blocking" a sender
-- therefore means: when their mail arrives, the inbound processor moves it
-- straight to Gmail Spam and suppresses the Slack card + the customerlove
-- auto-reply. Enforcement lives in src/lib/gmail-inbound-processor.ts, which
-- is the single choke point shared by the Pub/Sub push webhook and the
-- legacy 5-min poll, so both ingestion paths are covered.
--
-- match_type is 'email' today (exact address). A 'domain' rule (block every
-- @spamco.com) can be added later with no schema change: the matcher in
-- src/lib/blocked-senders.ts already checks both. pattern is stored lower-cased
-- and normalised so lookups are a plain equality check.

create table if not exists public.blocked_senders (
  id              uuid primary key default gen_random_uuid(),
  pattern         text not null,                 -- lower-cased email address or bare domain
  match_type      text not null default 'email'
                    check (match_type in ('email', 'domain')),
  reason          text,                          -- optional free-text note
  blocked_by      uuid references auth.users(id) on delete set null,
  blocked_by_name text,                          -- display-name snapshot for the audit list
  created_at      timestamptz not null default now(),
  unique (pattern)
);

comment on table public.blocked_senders is
  'Sender blocklist for the customerlove inbox. A match moves the inbound mail to Gmail Spam and suppresses the Slack notification + auto-reply. match_type email = exact address, domain = whole domain.';

-- ── Data API access ─────────────────────────────────────────────────────────
-- Staff-only. Read/written through the service-role admin client (the inbound
-- processor, the block-sender API route). No anon access. authenticated gets
-- read + insert + delete for the inbox management UI; the admin client
-- (service_role) is the actual enforcement reader and bypasses RLS.
grant select, insert, delete on public.blocked_senders to authenticated;
grant select, insert, update, delete on public.blocked_senders to service_role;

alter table public.blocked_senders enable row level security;
-- No policies: reads/writes go through admin-client endpoints gated by
-- requireVerifiedInbox(). service_role bypasses RLS.
