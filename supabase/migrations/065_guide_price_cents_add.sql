-- 065_guide_price_cents_add.sql
-- Phase 1 of dropping the legacy text-typed guide_price columns. Adds
-- a sibling integer-cents column on both course_templates and courses,
-- backfilled from the existing text values. The text columns stay in
-- place during the deploy window; phase 2 (066) drops them once the
-- code switchover lands.
--
-- All current values in both tables are clean integer strings (verified
-- pre-migration: "99", "149", "199"), so the cast through numeric is
-- straightforward. NULL stays NULL.

ALTER TABLE public.course_templates
  ADD COLUMN IF NOT EXISTS guide_price_cents integer;

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS guide_price_cents integer;

UPDATE public.course_templates
SET guide_price_cents = (guide_price::numeric * 100)::integer
WHERE guide_price IS NOT NULL
  AND guide_price <> ''
  AND guide_price_cents IS NULL;

UPDATE public.courses
SET guide_price_cents = (guide_price::numeric * 100)::integer
WHERE guide_price IS NOT NULL
  AND guide_price <> ''
  AND guide_price_cents IS NULL;
