-- One-off correction: Jana enrolled Friederike Hein (friederike.hein@outlook.de)
-- manually in the LearnWorlds course `aufbaukurs-lippen-online` on 2026-05-12
-- without going through the booking flow. The LW enrollment exists, but no
-- course_bookings row was created, so the Onlinekurs Lippen card never
-- appeared on /mein-konto. She saw only the two Dermalfiller cards from her
-- existing Kombikurs (Online + legacy import) and complained that she could
-- not access the Lippen course.
--
-- Fix: insert a free (amount_paid = 0) Onlinekurs course_bookings row for
-- her, linked to the Aufbaukurs Lippen template, with no session and no
-- Stripe IDs. After this runs:
--   - /mein-konto renders an "Aufbaukurs Lippen" Onlinekurs card backed by
--     the template's lw_slug_online.
--   - The admin LMS-Zugriff panel flips the row from "Nur LW" to "In LW".
--
-- Idempotent: the NOT EXISTS guard prevents a second insert if this is run
-- twice.

WITH azubi AS (
  SELECT id, email, first_name, last_name, phone, profile_complete
  FROM public.v_auszubildende
  WHERE lower(email) = lower('friederike.hein@outlook.de')
  LIMIT 1
),
tpl AS (
  SELECT id
  FROM public.course_templates
  WHERE course_key = 'aufbaukurs_lippen'
  LIMIT 1
)
INSERT INTO public.course_bookings (
  session_id,
  template_id,
  course_type,
  auszubildende_id,
  first_name,
  last_name,
  email,
  phone,
  profile_complete,
  status,
  amount_paid,
  stripe_checkout_session_id,
  stripe_customer_id,
  created_at
)
SELECT
  NULL,
  tpl.id,
  'Onlinekurs',
  azubi.id,
  azubi.first_name,
  azubi.last_name,
  azubi.email,
  azubi.phone,
  COALESCE(azubi.profile_complete, true),
  'booked',
  0,
  NULL,
  NULL,
  '2026-05-12 00:00:00+00'
FROM azubi, tpl
WHERE NOT EXISTS (
  SELECT 1
  FROM public.course_bookings cb
  WHERE cb.auszubildende_id = azubi.id
    AND cb.template_id = tpl.id
    AND cb.course_type = 'Onlinekurs'
);
