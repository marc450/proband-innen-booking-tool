-- Add employer + specialisation to profiles for Dozent:innen.
-- Only meaningful when is_dozent = true; the admin UI hides these
-- fields otherwise. Nullable text columns, no default — staff who
-- aren't Dozent:innen simply leave them empty.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dozent_employer text,
  ADD COLUMN IF NOT EXISTS dozent_specialization text;
