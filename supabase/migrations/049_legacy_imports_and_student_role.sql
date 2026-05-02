-- 049_legacy_imports_and_student_role.sql
--
-- Three changes that prepare the database for two upcoming initiatives:
-- (1) opening Supabase Auth to public customers via a new 'student' role,
-- (2) importing historical purchases from HubSpot (and later LearnWorlds)
--     so legacy customers show up in the staff dashboard with their full
--     purchase history.
--
-- The migration is idempotent — every statement either uses IF NOT EXISTS
-- or guards the change against re-application.

-- ── 1. profiles.role: allow 'student' (and resync 'nutzer', which the
--    app has been writing for a while without an updated CHECK).
--
-- The original constraint from 015_user_profiles.sql was
--   CHECK (role IN ('admin', 'dozent'))
-- The app currently writes 'admin' or 'nutzer'. We drop whichever check
-- constraint is on the role column today and re-create it with the full
-- set of values, including 'student' for public customer accounts.

DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  WHERE t.relname = 'profiles'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%role%'
  LIMIT 1;

  IF cname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE profiles DROP CONSTRAINT ' || quote_ident(cname);
  END IF;
END $$;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'nutzer', 'dozent', 'student'));


-- ── 2. auszubildende: link to Supabase auth + legacy import metadata.
--
-- user_id is set when a customer claims their ephia.de account (lazy
-- migration on first login). Until then it stays NULL — the contact
-- exists in the staff dashboard, but no Supabase Auth row exists for
-- them and no automatic emails are sent.
--
-- legacy_source / legacy_imported_at distinguish "imported from an
-- external system" from "natively created via a booking on our site".
-- Lets the staff UI badge them and lets the analytics queries split
-- the two populations cleanly.

ALTER TABLE auszubildende
  ADD COLUMN IF NOT EXISTS user_id            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS legacy_imported_at timestamptz,
  ADD COLUMN IF NOT EXISTS legacy_source      text;

CREATE INDEX IF NOT EXISTS auszubildende_user_id_idx
  ON auszubildende (user_id);


-- ── 3. legacy_bookings: historical purchases imported from HubSpot,
--    LearnWorlds, etc. Distinct from course_bookings (live system data)
--    because legacy purchases include products that are no longer in
--    our offering (Cap merch, deprecated course bundles) and don't have
--    a session_id / template_id we can link to.
--
-- product_name is a free-text snapshot of what was sold. course_date
-- is only set for live-event purchases (Praxiskurse / Kombikurse) —
-- for online-only courses and merch it stays NULL.
--
-- Re-import safety: source_dedupe_hash is a sha256 of
-- "lower(email)|product_name|amount|close_date" computed by the
-- importer. Combined with `source`, the unique index lets the upload
-- endpoint use ON CONFLICT DO NOTHING so re-uploading the same export
-- file is a no-op.

CREATE TABLE IF NOT EXISTS legacy_bookings (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auszubildende_id   uuid NOT NULL REFERENCES auszubildende(id) ON DELETE CASCADE,
  product_name       text NOT NULL,
  amount_eur         numeric(10, 2),
  course_date        date,
  purchased_at       timestamptz,
  source             text,
  source_dedupe_hash text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS legacy_bookings_auszubildende_idx
  ON legacy_bookings (auszubildende_id);

CREATE UNIQUE INDEX IF NOT EXISTS legacy_bookings_dedupe_idx
  ON legacy_bookings (source, source_dedupe_hash)
  WHERE source IS NOT NULL AND source_dedupe_hash IS NOT NULL;


-- ── RLS: service-role-only, same pattern as auszubildende_emails.
ALTER TABLE legacy_bookings ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT/UPDATE/DELETE policies = denied for everyone except
-- the service_role used by our admin API routes. Staff dashboard pages
-- always go through /api/admin/* which uses createAdminClient().
