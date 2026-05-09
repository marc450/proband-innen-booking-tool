-- 093_lms_quiz_voucher_50_eur.sql
-- Switch the quiz reward from "5% Gutschein" to "50 € Gutschein".
--
-- Two updates on the quiz lesson body:
--   1. The intro paragraph (content[1]) has the discount in plain
--      prose text and is rewritten.
--   2. The quiz node (content[2]) gets a new `voucherLabel` attr
--      (used by QuizBlock for the intro + result reveal copy) and
--      the `passCouponCode` is renamed from TUTORIAL5 → TUTORIAL50
--      so the code matches the new amount.
--
-- ⚠ Marc: create the matching promo code in Stripe (50 € off the
-- Grundkurs Botulinum, code = TUTORIAL50) before announcing the
-- quiz publicly. If you'd rather keep the old code, change the
-- value below before running.
--
-- Idempotent: re-running just sets the same values.

BEGIN;

UPDATE public.lms_lessons
SET body = jsonb_set(
  jsonb_set(
    jsonb_set(
      body,
      '{content,1,content,0,text}',
      '"Fünf Fragen zum gerade Gelernten. Beantwortest Du alle richtig, bekommst Du einen 50 € Gutschein für den Grundkurs Botulinum."'::jsonb
    ),
    '{content,2,attrs,passCouponCode}',
    '"TUTORIAL50"'::jsonb
  ),
  '{content,2,attrs,voucherLabel}',
  '"50 € Gutschein"'::jsonb
)
WHERE chapter_id = (
  SELECT ch.id FROM public.lms_chapters ch
  JOIN public.lms_courses co ON co.id = ch.course_id
  WHERE co.slug = 'kostenloses-botox-tutorial'
    AND ch.slug = 'teste-dein-wissen'
)
AND slug = 'mache-jetzt-den-test';

COMMIT;
