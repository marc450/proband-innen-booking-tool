-- 068_price_gross_cents_add.sql
-- Phase 1 of converting course_templates.price_gross_* from numeric
-- euros to integer cents. Adds the four sibling _cents columns and
-- backfills from the existing numeric values. Phase 2 (069) drops the
-- old numeric columns once the deploy lands.
--
-- All current values are clean integers (no decimal cents in scope),
-- so the cast is straightforward.

ALTER TABLE public.course_templates
  ADD COLUMN IF NOT EXISTS price_gross_online_cents integer,
  ADD COLUMN IF NOT EXISTS price_gross_praxis_cents integer,
  ADD COLUMN IF NOT EXISTS price_gross_kombi_cents integer,
  ADD COLUMN IF NOT EXISTS price_gross_premium_cents integer;

UPDATE public.course_templates
SET
  price_gross_online_cents  = COALESCE(price_gross_online_cents,  (price_gross_online  * 100)::integer),
  price_gross_praxis_cents  = COALESCE(price_gross_praxis_cents,  (price_gross_praxis  * 100)::integer),
  price_gross_kombi_cents   = COALESCE(price_gross_kombi_cents,   (price_gross_kombi   * 100)::integer),
  price_gross_premium_cents = COALESCE(price_gross_premium_cents, (price_gross_premium * 100)::integer);
