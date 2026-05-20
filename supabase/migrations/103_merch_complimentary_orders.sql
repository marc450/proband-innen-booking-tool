-- 103_merch_complimentary_orders.sql
-- Track non-paid merch orders ("Geschenke") so they show up in the
-- admin overview, count against stock, and stay separable from real
-- revenue. Replaces the external spreadsheet Sophia was maintaining.
--
-- is_complimentary defaults to false so all existing rows stay
-- correctly classified as paid Stripe orders.

ALTER TABLE public.merch_orders
  ADD COLUMN IF NOT EXISTS is_complimentary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS complimentary_reason text;

CREATE INDEX IF NOT EXISTS merch_orders_is_complimentary_idx
  ON public.merch_orders(is_complimentary)
  WHERE is_complimentary = true;
