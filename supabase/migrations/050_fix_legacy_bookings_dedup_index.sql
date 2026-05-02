-- 050_fix_legacy_bookings_dedup_index.sql
--
-- Fixes a bug introduced in 049: the dedup unique index on
-- legacy_bookings was created as a partial index (`WHERE source IS NOT
-- NULL AND source_dedupe_hash IS NOT NULL`). Partial indexes cannot be
-- used as ON CONFLICT targets by the Supabase JS upsert client, so the
-- importer at /api/admin/import-hubspot-deals failed with:
--
--   "there is no unique or exclusion constraint matching the ON CONFLICT
--    specification"
--
-- The WHERE clause was redundant: Postgres treats NULL as distinct in
-- unique indexes, so rows with NULL in either column never conflict
-- regardless. Drop the partial index, lock the columns NOT NULL (the
-- importer always sets them anyway), and re-create the index without
-- the predicate so ON CONFLICT (source, source_dedupe_hash) matches.

DROP INDEX IF EXISTS legacy_bookings_dedupe_idx;

ALTER TABLE legacy_bookings
  ALTER COLUMN source             SET NOT NULL,
  ALTER COLUMN source_dedupe_hash SET NOT NULL;

CREATE UNIQUE INDEX legacy_bookings_dedupe_idx
  ON legacy_bookings (source, source_dedupe_hash);
