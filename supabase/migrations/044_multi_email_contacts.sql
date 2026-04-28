-- Multi-email per contact: one Auszubildende:r or Patient:in can have many
-- email addresses (primary + aliases). Inbox lookups, dedupe, and merge all
-- match against any of the addresses; outbound sends only ever go to the
-- primary. Keeps the existing `auszubildende.email` and `patients.email_hash`
-- columns intact during the transition window so older code paths keep
-- working until the rollout is complete.
--
-- Two parallel tables because the underlying contact tables differ:
--   - auszubildende: plaintext email, simple uniqueness constraint
--   - patients:      E2EE — email lives inside `patients.encrypted_data`
--                    today; here we add per-email encryption with a SHA-256
--                    hash for lookup, mirroring the existing pattern.
--
-- Email is always stored lowercased (matches the app's `.toLowerCase()`
-- normalisation in saveEmail / API handlers). UNIQUE (email) is enough — no
-- need for citext.

-- ── Auszubildende: plaintext multi-email ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.auszubildende_emails (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auszubildende_id  uuid NOT NULL REFERENCES public.auszubildende(id) ON DELETE CASCADE,
  email             text NOT NULL,
  is_primary        boolean NOT NULL DEFAULT false,
  -- 'manual'  – added in dashboard UI
  -- 'import'  – CSV import
  -- 'merge'   – inherited when contact B was merged into contact A
  -- 'booking' – auto-attached when a new booking arrived for this address
  -- 'backfill'– seeded from auszubildende.email during migration
  source            text,
  created_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT auszubildende_emails_lowercase_chk
    CHECK (email = lower(email)),
  CONSTRAINT auszubildende_emails_unique
    UNIQUE (email)
);

-- At most one primary per contact. Partial unique index = postgres-native
-- enforcement; no triggers needed.
CREATE UNIQUE INDEX IF NOT EXISTS auszubildende_emails_one_primary
  ON public.auszubildende_emails(auszubildende_id)
  WHERE is_primary;

CREATE INDEX IF NOT EXISTS auszubildende_emails_contact_idx
  ON public.auszubildende_emails(auszubildende_id);


-- ── Patients: E2EE multi-email ─────────────────────────────────────────
-- Mirrors the encryption scheme used on patients.encrypted_data: each row
-- has its own AES-256-GCM key (RSA-wrapped via ENCRYPTION_PUBLIC_KEY) and
-- its own IV. The plaintext email is encrypted into `encrypted_email`. The
-- `email_hash` (SHA-256, salt-free, lowercased input) is the lookup key —
-- same pattern as patients.email_hash today.
CREATE TABLE IF NOT EXISTS public.patient_email_hashes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  email_hash      text NOT NULL,
  encrypted_email text NOT NULL,
  encrypted_key   text NOT NULL,
  encryption_iv   text NOT NULL,
  is_primary      boolean NOT NULL DEFAULT false,
  source          text,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT patient_email_hashes_unique
    UNIQUE (email_hash)
);

CREATE UNIQUE INDEX IF NOT EXISTS patient_email_hashes_one_primary
  ON public.patient_email_hashes(patient_id)
  WHERE is_primary;

CREATE INDEX IF NOT EXISTS patient_email_hashes_patient_idx
  ON public.patient_email_hashes(patient_id);


-- ── RLS: staff-only via authenticated session, same pattern as merch ───
ALTER TABLE public.auszubildende_emails    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_email_hashes    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auszubildende_emails staff rw" ON public.auszubildende_emails;
DROP POLICY IF EXISTS "patient_email_hashes staff rw" ON public.patient_email_hashes;

CREATE POLICY "auszubildende_emails staff rw" ON public.auszubildende_emails
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "patient_email_hashes staff rw" ON public.patient_email_hashes
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);


-- ── Backfill: Auszubildende ────────────────────────────────────────────
-- One row per existing auszubildende.email, marked primary. Idempotent:
-- ON CONFLICT skips contacts whose email is already in the new table
-- (e.g. if the migration is re-run after a partial failure).
INSERT INTO public.auszubildende_emails
  (auszubildende_id, email, is_primary, source)
SELECT
  id,
  lower(email),
  true,
  'backfill'
FROM public.auszubildende
WHERE email IS NOT NULL AND email <> ''
ON CONFLICT (email) DO NOTHING;


-- NOTE: Patient backfill is NOT done in this migration because patient
-- emails live inside the encrypted blob (patients.encrypted_data). They
-- need to be decrypted in Node, re-encrypted into patient_email_hashes,
-- and inserted with a fresh SHA-256 email_hash. Run the companion script
-- `scripts/backfill-patient-email-hashes.ts` after this migration applies.
