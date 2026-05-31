-- 123_proband_reviews.sql
-- One-time review collection from Proband:innen (the models treated during
-- training courses, stored in the E2EE-encrypted `patients` table). Mirrors the
-- doctor-side course_reviews flow, but anchored on the proband (one review per
-- person) so the "alle Proband:innen anschreiben" pass can reach the full base.
--
-- Patient PII (name, email, ...) stays E2EE-encrypted. The columns added here
-- (token + send marker) are non-PII plaintext, just like the existing
-- email_hash column. The proband-submitted first_name + body_text in
-- proband_reviews are plaintext by design: a review is written to be shown,
-- so it lives outside the encryption envelope like course_reviews does.
--
-- No public display surface yet. Reviews are collected as is_published = false
-- and moderated in the dashboard; wiring them onto a public page is a follow-up.

-- ── Token + one-time-send marker on the proband ────────────────────────────
-- review_submit_token validates the public submission link; it is anchored on
-- the patient, not a booking, so a single token covers a proband regardless of
-- how many bookings they have. review_request_resent_at is the idempotency
-- marker for the one-time bulk pass (a second click can't re-ping anyone).
alter table public.patients
  add column if not exists review_submit_token text,
  add column if not exists review_request_resent_at timestamptz;

-- Partial unique so the many NULLs coexist.
create unique index if not exists patients_review_submit_token_key
  on public.patients (review_submit_token)
  where review_submit_token is not null;

-- ── proband_reviews table ──────────────────────────────────────────────────
create table if not exists public.proband_reviews (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null unique references public.patients(id) on delete cascade,
  rating        smallint not null check (rating between 1 and 5),
  first_name    text not null check (length(trim(first_name)) > 0),
  body_text     text not null check (length(trim(body_text)) > 0),
  is_published  boolean not null default false,
  submitted_at  timestamptz not null default now(),
  published_at  timestamptz,
  created_at    timestamptz not null default now()
);

comment on table public.proband_reviews is
  'Reviews from Proband:innen (models) about their EPHIA treatment experience. One per proband, submitted via tokenized link in a one-time request email. body_text is meant for eventual public display once is_published flips true.';
comment on column public.proband_reviews.first_name is
  'Proband-submitted first name for display. Plaintext by design (review is written to be shown), unlike the encrypted patients.encrypted_data.';
comment on column public.proband_reviews.is_published is
  'Staff moderation flag. Reviews land as false; staff toggles true once a public display surface exists.';

create index if not exists idx_proband_reviews_published
  on public.proband_reviews (is_published, submitted_at desc);

-- ── Data API access ─────────────────────────────────────────────────────────
-- Written and read exclusively through the service-role admin client (the
-- public submit endpoint and the dashboard moderation view). No public display
-- yet, so anon gets nothing. service_role bypasses RLS for every server path.
grant select, insert, update, delete on public.proband_reviews to service_role;
grant select on public.proband_reviews to authenticated;

alter table public.proband_reviews enable row level security;
-- No anon/authenticated policies until a public display surface exists; the
-- service-role admin client bypasses RLS and is the only writer/reader.
