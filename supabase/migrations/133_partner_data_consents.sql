-- 133_partner_data_consents.sql
-- Galderma Partner-Consent (signed MoU 2026-06-20). At the end of a
-- Praxis-/Kombikurs the Kursbetreuung collects an explicit, signed
-- consent (on a tablet) from each participating Ärzt:in/Zahnmediziner:in
-- to forward their contact data to Galderma Laboratorium GmbH (Düsseldorf,
-- no third-country transfer). One day after the course a cron exports all
-- active, not-yet-exported consents to Galderma exactly once.
--
-- Data subjects are Auszubildende (course_bookings), never Proband:innen.
-- This data is plaintext by design (course_bookings is not E2EE); the
-- signed consent PDF lives in a PRIVATE Storage bucket and is read only
-- server-side via the service-role admin client.
--
-- Eligibility lives in code (no per-template flag, KISS):
--   course_type IN ('Praxiskurs','Kombikurs') AND session_id IS NOT NULL.
-- A second sponsor later would add a partner_sponsor column, not now.

-- ── Consent records (one per booking + partner) ─────────────────────────────
create table if not exists public.partner_data_consents (
  id                      uuid primary key default gen_random_uuid(),
  course_booking_id       uuid not null references public.course_bookings(id) on delete cascade,
  partner                 text not null default 'galderma',
  consented_at            timestamptz,            -- NULL = no decision yet
  revoked_at              timestamptz,            -- NULL = still active
  exported_at             timestamptz,            -- NULL = not yet sent to Galderma
  withdrawal_forwarded_at timestamptz,            -- when the revoke was forwarded to Galderma
  consent_text_version    text not null,          -- snapshot id of the wording shown at signing
  source                  text not null default 'kursbetreuung_in_room',
  consented_by_staff_id   uuid references auth.users(id) on delete set null,
  signature_storage_path  text,                   -- path of the signed PDF in the private bucket
  signed_payload          jsonb,                  -- name/email/phone/address snapshot at signing
  withdrawal_token        text,                   -- single-use token for the email revoke link
  created_at              timestamptz not null default now(),
  unique (course_booking_id, partner)
);

comment on table public.partner_data_consents is
  'Per-booking consent to forward Auszubildende contact data to a sponsoring partner (Galderma). consented_at/revoked_at/exported_at drive the once-per-person export; signed PDF in the partner-consents Storage bucket.';
comment on column public.partner_data_consents.signed_payload is
  'Snapshot of the exact name/email/phone/postal-address shown and signed on the tablet, so the export and audit reflect what the participant actually agreed to even if the auszubildende row changes later.';

-- Partial unique so the many NULL tokens coexist.
create unique index if not exists partner_data_consents_withdrawal_token_key
  on public.partner_data_consents (withdrawal_token)
  where withdrawal_token is not null;

-- Export selection hits this filter every cron run.
create index if not exists idx_partner_data_consents_exportable
  on public.partner_data_consents (partner, consented_at, revoked_at, exported_at);

create index if not exists idx_partner_data_consents_booking
  on public.partner_data_consents (course_booking_id);

-- ── Export audit log (one row per Galderma send) ────────────────────────────
create table if not exists public.partner_data_exports (
  id                 uuid primary key default gen_random_uuid(),
  partner            text not null default 'galderma',
  course_session_id  uuid references public.course_sessions(id) on delete set null,
  participant_count  integer not null,
  participant_ids    uuid[] not null,             -- partner_data_consents.id list
  payload_snapshot   jsonb not null,              -- [{vorname, nachname, email, telefon, anschrift, kurs_titel, kurs_datum}]
  triggered_by       text not null default 'cron',
  resend_message_id  text,
  resend_status      text,                        -- 'sent' | 'bounced' | 'failed'
  recipient_to       text not null,
  recipient_cc       text[] not null default '{}',
  created_at         timestamptz not null default now()
);

comment on table public.partner_data_exports is
  'Audit trail of every partner data export. payload_snapshot is the exact rows sent so a later dispute can be reconstructed without re-deriving from live tables.';

create index if not exists idx_partner_data_exports_session
  on public.partner_data_exports (course_session_id, created_at desc);

-- ── Data API access ─────────────────────────────────────────────────────────
-- Written and read exclusively through the service-role admin client (the
-- consent record endpoint, the revoke endpoint, the cron export and the
-- dashboard audit page). No anon access. authenticated gets read for the
-- admin audit surface; all writes go through service_role (bypasses RLS).
grant select, insert, update on public.partner_data_consents to service_role;
grant select on public.partner_data_consents to authenticated;

grant select, insert on public.partner_data_exports to service_role;
grant select on public.partner_data_exports to authenticated;

alter table public.partner_data_consents enable row level security;
alter table public.partner_data_exports enable row level security;
-- No anon/authenticated policies: the service-role admin client is the only
-- writer/reader of records; staff reads go through admin-client endpoints.

-- ── Private Storage bucket for the signed consent PDFs ──────────────────────
-- PRIVATE (public = false): contains PII (name + postal address + signature).
-- Uploads and downloads happen server-side via the service-role admin client,
-- which bypasses Storage RLS, so no anon/authenticated object policies are
-- needed. Staff download via short-lived signed URLs minted server-side.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'partner-consents',
  'partner-consents',
  false,
  10485760, -- 10 MB per file, ample for a one-page signed PDF
  array['application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
