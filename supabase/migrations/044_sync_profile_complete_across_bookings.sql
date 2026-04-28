-- Backfill: course_bookings.profile_complete is rendered as the
-- "Profil unvollständig" badge in the auszubildende dashboard, but it
-- was historically only updated on the single booking that ran the
-- profile-completion form. Sibling bookings for the same contact
-- stayed at false even after the profile was filled in, producing the
-- "3 unvollständig + 1 vollständig on the same person" bug.
--
-- This migration syncs the per-booking flag with the per-contact flag
-- on auszubildende. Any auszubildende whose profile_complete is true
-- gets all of their course_bookings stamped to true. Going forward,
-- complete-profile/route.ts and post-purchase.ts propagate the flag
-- to every sibling booking on each completion, so this backfill is a
-- one-off catch-up.

UPDATE course_bookings cb
SET profile_complete = true
FROM auszubildende a
WHERE cb.auszubildende_id = a.id
  AND a.profile_complete = true
  AND cb.profile_complete IS DISTINCT FROM true;
