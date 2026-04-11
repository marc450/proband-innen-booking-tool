-- 030: Add card_description column to course_templates.
--
-- Separate from `description` (Proband:innen booking page) and
-- `description_online/praxis/kombi` (Auszubildende variants). This one
-- drives the marketing card blurb on `kurse.ephia.de` (the /kurse route).
--
-- Intentionally not backfilled — Marc will fill each course in via the
-- admin Kursangebot dialog. The /kurse component falls back to the
-- hardcoded static description in `src/content/kurse/home.ts` when this
-- column is NULL, so the public page doesn't break between migration
-- and content entry.

ALTER TABLE course_templates
  ADD COLUMN IF NOT EXISTS card_description text;
