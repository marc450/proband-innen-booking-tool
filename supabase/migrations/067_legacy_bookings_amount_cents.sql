-- 067_legacy_bookings_amount_cents.sql
-- Convert legacy_bookings.amount_eur from numeric(10,2) euros to
-- integer cents and rename to amount_cents. Aligns the column with
-- course_bookings.amount_paid (already cents) and merch_orders.*_cents
-- so the dashboard can use one formatter for everything.
--
-- 473 rows, all from clean HubSpot/LW exports. No nulls in scope, but
-- the cast preserves NULL where present.

ALTER TABLE public.legacy_bookings
  ALTER COLUMN amount_eur TYPE integer USING (amount_eur * 100)::integer;

ALTER TABLE public.legacy_bookings
  RENAME COLUMN amount_eur TO amount_cents;
