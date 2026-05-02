-- 051_auszubildende_lw_user_id.sql
--
-- Stores the LearnWorlds user ID alongside the email match key so we
-- can call LW's user-scoped APIs (progress, certificates) without an
-- email-based lookup every time. Also lets us spot users we've created
-- in LW via API at checkout but haven't yet linked to in our own DB.
--
-- Partial unique index: most contacts won't have an LW account
-- (Praxis-only customers, manually created contacts), so NULLs are
-- common. Postgres treats NULL as distinct in unique indexes anyway,
-- but the explicit WHERE makes the intent clear and skips the index
-- entries for the NULL majority.

ALTER TABLE auszubildende
  ADD COLUMN IF NOT EXISTS lw_user_id text;

CREATE UNIQUE INDEX IF NOT EXISTS auszubildende_lw_user_id_idx
  ON auszubildende (lw_user_id)
  WHERE lw_user_id IS NOT NULL;
