-- Backfill profile_complete for auszubildende rows whose essential fields
-- are already populated. Typical source of false-negatives:
--
-- - HubSpot legacy imports: inserted the row with first_name, last_name,
--   phone, birthdate, specialty, gender, efn already filled but never
--   went through the /courses/success form, so profile_complete stayed
--   at the DEFAULT false.
-- - Staff-entered rows.
--
-- The /api/complete-profile contract defines "complete" as:
--   title, gender, specialty, birthdate, efn (unless Zahnmedizin).
--
-- Title is intentionally NOT required here because the TITLE_OPTIONS
-- list has an explicit "Kein Titel" option, which means null is a valid
-- choice that a user could legitimately have submitted.

UPDATE public.auszubildende
SET profile_complete = true
WHERE profile_complete = false
  AND first_name IS NOT NULL AND length(trim(first_name)) > 0
  AND last_name  IS NOT NULL AND length(trim(last_name))  > 0
  AND email      IS NOT NULL AND length(trim(email))      > 0
  AND phone      IS NOT NULL AND length(trim(phone))      > 0
  AND birthdate  IS NOT NULL
  AND specialty  IS NOT NULL AND length(trim(specialty))  > 0
  AND gender     IS NOT NULL AND length(trim(gender))     > 0
  AND (efn IS NOT NULL OR specialty ILIKE 'Zahnmedizin%');

-- Propagate to course_bookings so the "Profil unvollständig" badge in
-- Dashboard > Kursbuchungen stops showing for backfilled doctors.
UPDATE public.course_bookings cb
SET profile_complete = true
FROM public.auszubildende a
WHERE cb.auszubildende_id = a.id
  AND a.profile_complete = true
  AND (cb.profile_complete IS NULL OR cb.profile_complete = false);
