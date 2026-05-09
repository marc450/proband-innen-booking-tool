-- 096_lms_drop_quiz_coupons.sql
-- Remove the quiz coupon registry. The dynamic 50 € voucher feature
-- is being replaced by a celebration screen + invitation to the
-- Grundkurs Botulinum, so the table and its API endpoint are no
-- longer used.
--
-- Existing Stripe coupons / promo codes already issued from the API
-- continue to live in Stripe — they expire on their own. Marc can
-- archive them in the Stripe dashboard if desired.

BEGIN;

DROP TABLE IF EXISTS public.lms_quiz_coupons;

COMMIT;
