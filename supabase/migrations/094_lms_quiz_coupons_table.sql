-- 094_lms_quiz_coupons_table.sql
-- Per-email coupon registry for the quiz reward.
-- One row per email (PRIMARY KEY) so we can enforce
-- "one code per email" and idempotently return the existing code if
-- the same email passes the quiz again. Code is unique across the
-- whole table for safety.
--
-- The actual Stripe coupon + promotion_code are created at the same
-- time and their IDs stored here for traceability + future cleanup.
-- expires_at mirrors the Stripe promotion_code's expires_at (5 days
-- from creation). Stripe enforces the actual expiry; this column is
-- a convenience for our API to know when a code becomes inactive.
--
-- RLS: enabled, no public policies. The API route (service-role) is
-- the only writer/reader.

BEGIN;

CREATE TABLE IF NOT EXISTS public.lms_quiz_coupons (
  email                 text PRIMARY KEY,
  code                  text NOT NULL UNIQUE,
  stripe_coupon_id      text NOT NULL,
  stripe_promo_code_id  text NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  expires_at            timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS lms_quiz_coupons_expires_at_idx
  ON public.lms_quiz_coupons (expires_at);

ALTER TABLE public.lms_quiz_coupons ENABLE ROW LEVEL SECURITY;

COMMIT;
