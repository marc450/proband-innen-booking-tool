-- 098_profiles_anon_name_read.sql
-- The Proband:innen booking page on proband-innen.ephia.de runs as the
-- Supabase `anon` role (it's a public, no-login page). The page joins
-- profiles via instructor_id to display the "Kursleitende Ärzt:in"
-- name on each date card.
--
-- Until this migration, profiles' only SELECT policy was
-- "authenticated_read_profiles" (see 015_user_profiles.sql), so the
-- anonymous join silently returned NULL and the card row was hidden.
-- This adds an anon SELECT policy AND restricts column-level GRANTs so
-- only the public-facing name columns leak to anon — email, role,
-- is_dozent, etc. stay private.
--
-- Idempotent: re-runs are no-ops thanks to IF NOT EXISTS / DROP-then-
-- CREATE patterns.

DROP POLICY IF EXISTS "anon_read_profile_names" ON public.profiles;

CREATE POLICY "anon_read_profile_names"
  ON public.profiles
  FOR SELECT
  TO anon
  USING (true);

-- Defense in depth: even with the policy, anon should only see the
-- columns the public booking funnel needs. Column-level GRANT
-- complements the RLS policy.
REVOKE SELECT ON public.profiles FROM anon;
GRANT  SELECT (id, title, first_name, last_name)
  ON   public.profiles
  TO   anon;
