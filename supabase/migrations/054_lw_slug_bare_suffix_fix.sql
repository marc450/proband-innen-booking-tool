-- Bug fix for migration 053. The slug → course_key helper only
-- recognised the long suffix forms ("-onlinekurs", "-praxiskurs",
-- "-kombikurs"), but the real LW imports use the bare forms
-- ("-online", "-praxis", "-kombi"). As a result, a slug like
-- "grundkurs-dermalfiller-online" was reduced to "dermalfiller-online"
-- instead of "dermalfiller", missing the join against
-- course_templates.course_key. Net effect on /mein-konto: cards fell
-- back to showing the raw slug as the title and had no image.
--
-- This migration: refresh both helpers to also strip the bare suffixes,
-- then re-run the four backfill UPDATEs (only filling rows where the
-- column is still NULL, so already-populated values are preserved).

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
  -- before the bare "-online" on slugs that have the longer form.
  s := regexp_replace(
    s,
    '-(praxiskurs|praxis-kurs|onlinekurs|online-kurs|kombikurs|kombi-kurs|hybrid|online|praxis|kombi)$',
    ''
  );
  -- Level prefix.
  s := regexp_replace(s, '^(grundkurs|aufbaukurs)-', '');
  RETURN nullif(s, '');
END;
$$;

CREATE OR REPLACE FUNCTION public.lw_course_type(slug text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  s text := lower(coalesce(slug, ''));
BEGIN
  IF s ~ 'praxis' THEN RETURN 'praxis';
  ELSIF s ~ 'kombi' THEN RETURN 'kombi';
  ELSIF s ~ 'hybrid' THEN RETURN 'hybrid';
  ELSIF s ~ 'online' THEN RETURN 'online';
  -- A 6+ digit run on a bare slug typically means a date-tagged
  -- praxis session.
  ELSIF s ~ '\d{6,}' THEN RETURN 'praxis';
  ELSE RETURN 'online';
  END IF;
END;
$$;

-- Re-run the four backfills. The IS NULL guard means we don't clobber
-- any slugs that 053 happened to populate correctly (the long-suffix
-- variants).
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
