-- Separate hero image for Proband:innen-facing course cards.
-- When non-null, the /kurse/werde-proband-in and /book/privat cards render
-- this image instead of the template's default image_url. NULL means
-- "use the default image" so existing rows keep working unchanged.

ALTER TABLE public.course_templates
  ADD COLUMN IF NOT EXISTS image_url_probanden TEXT;
