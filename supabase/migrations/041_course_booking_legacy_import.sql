-- Mark course_bookings that were imported from the legacy Lovable+Zapier
-- system so the post-profile-completion flow can skip the transactional
-- email + LearnWorlds + HubSpot + Slack steps for them. Those doctors
-- already received their confirmations, are already enrolled in LW, and
-- are already in HubSpot from the pre-migration ops setup. Completing
-- their profile in our app should ONLY capture the missing fields, not
-- re-send them duplicates of every confirmation email.
--
-- Marker: at the moment this migration runs, every doctor who booked a
-- course through the new system has completed their profile. Therefore
-- profile_complete = false uniquely identifies the legacy imports.
--
-- New bookings going forward default to legacy_import = false, so the
-- full post-purchase flow keeps running for any future fresh booking,
-- including bookings made by these same legacy doctors later.

ALTER TABLE public.course_bookings
  ADD COLUMN IF NOT EXISTS legacy_import boolean NOT NULL DEFAULT false;

UPDATE public.course_bookings
SET legacy_import = true
WHERE profile_complete = false;
