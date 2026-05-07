-- 059_drop_dozent_role.sql
-- The 'dozent' role value was superseded by the is_dozent boolean in
-- migration 016 (profile_is_dozent.sql). It has been carried in the CHECK
-- constraint as a leftover ever since. STAFF_ROLES in the auth middleware
-- never included it, and a live count shows zero rows still using it, so
-- it is safe to remove from the constraint.

-- Belt and braces: also migrate any straggler row to the new pattern
-- (role='nutzer' + is_dozent=true) so this migration stays correct even
-- if it runs against an older snapshot.
UPDATE public.profiles
SET role = 'nutzer', is_dozent = true
WHERE role = 'dozent';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'nutzer', 'student'));
