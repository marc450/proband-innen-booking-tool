-- Bug fix for migrations 053/054. The lw_course_key helper assumed
-- course_templates.course_key was a hyphenated slug WITHOUT the
-- level prefix (e.g. "dermalfiller"), but the actual schema uses
-- UNDERSCORED keys WITH the level prefix
-- (e.g. "grundkurs_dermalfiller", "aufbaukurs_botulinum_periorale_zone").
-- As a result, the previous backfill matched zero templates and every
-- card on /mein-konto rendered the raw slug as the title.
--
-- This migration:
--   1. Replaces lw_course_key to (a) keep the level prefix and (b)
--      convert hyphens to underscores at the end so the result lines
--      up with course_key directly.
--   2. Re-runs the four lw_slug_* backfills. The IS NULL guard means
--      we only fill columns that aren't already populated; nothing
--      manually edited in the admin gets clobbered.

CREATE OR REPLACE FUNCTION public.lw_course_key(slug text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  s text := lower(btrim(coalesce(slug, '')));
BEGIN
  IF s = '' THEN RETURN NULL; END IF;
  -- Trailing date stamp: -DDMMYYYY (8 digits) or -DDMMYY (6 digits).
  s := regexp_replace(s, '-\d{6,8}$', '');
  -- Type suffix. Longer alternatives first so "-onlinekurs" matches
  -- before "-online".
  s := regexp_replace(
    s,
    '-(praxiskurs|praxis-kurs|onlinekurs|online-kurs|kombikurs|kombi-kurs|hybrid|online|praxis|kombi)$',
    ''
  );
  -- course_templates.course_key uses underscores throughout. Keep the
  -- level prefix (grundkurs/aufbaukurs/masterclass) — it's part of the
  -- key.
  s := replace(s, '-', '_');
  RETURN nullif(s, '');
END;
$$;

UPDATE public.course_templates ct
SET lw_slug_online = sub.slug
FROM (
  SELECT DISTINCT ON (public.lw_course_key(product_name))
    public.lw_course_key(product_name) AS course_key,
    product_name AS slug
  FROM public.legacy_bookings
  WHERE source LIKE 'lw_%'
    AND public.lw_course_type(product_name) = 'online'
  ORDER BY public.lw_course_key(product_name), product_name
) sub
WHERE ct.course_key = sub.course_key
  AND ct.lw_slug_online IS NULL;

UPDATE public.course_templates ct
SET lw_slug_praxis = sub.slug
FROM (
  SELECT DISTINCT ON (public.lw_course_key(product_name))
    public.lw_course_key(product_name) AS course_key,
    product_name AS slug
  FROM public.legacy_bookings
  WHERE source LIKE 'lw_%'
    AND public.lw_course_type(product_name) = 'praxis'
  ORDER BY public.lw_course_key(product_name), product_name DESC
) sub
WHERE ct.course_key = sub.course_key
  AND ct.lw_slug_praxis IS NULL;

UPDATE public.course_templates ct
SET lw_slug_kombi = sub.slug
FROM (
  SELECT DISTINCT ON (public.lw_course_key(product_name))
    public.lw_course_key(product_name) AS course_key,
    product_name AS slug
  FROM public.legacy_bookings
  WHERE source LIKE 'lw_%'
    AND public.lw_course_type(product_name) = 'kombi'
  ORDER BY public.lw_course_key(product_name), product_name DESC
) sub
WHERE ct.course_key = sub.course_key
  AND ct.lw_slug_kombi IS NULL;

UPDATE public.course_templates ct
SET lw_slug_hybrid = sub.slug
FROM (
  SELECT DISTINCT ON (public.lw_course_key(product_name))
    public.lw_course_key(product_name) AS course_key,
    product_name AS slug
  FROM public.legacy_bookings
  WHERE source LIKE 'lw_%'
    AND public.lw_course_type(product_name) = 'hybrid'
  ORDER BY public.lw_course_key(product_name), product_name DESC
) sub
WHERE ct.course_key = sub.course_key
  AND ct.lw_slug_hybrid IS NULL;
