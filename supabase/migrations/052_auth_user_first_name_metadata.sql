-- Backfill auth.users.raw_user_meta_data.first_name for existing
-- customers so the Supabase recovery email template can render
-- "Hi {{ .Data.first_name }}," instead of a generic greeting.
--
-- Source of truth is auszubildende.first_name, joined to auth.users
-- via auszubildende.user_id (set by /api/auth/set-password when the
-- customer creates their account through the lazy-migration flow).
--
-- The expression preserves any existing keys in raw_user_meta_data
-- (jsonb || jsonb merges right-side wins) while only writing first_name
-- when the source row has a non-empty value.

UPDATE auth.users u
SET raw_user_meta_data =
  COALESCE(u.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object('first_name', a.first_name)
FROM public.auszubildende a
WHERE a.user_id = u.id
  AND a.first_name IS NOT NULL
  AND btrim(a.first_name) <> '';
