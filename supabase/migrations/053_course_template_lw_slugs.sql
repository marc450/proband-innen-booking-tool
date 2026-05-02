-- Map every legacy_bookings row to a working LW URL by storing the
-- canonical LW slug per (template, course-type) on course_templates.
--
-- Why per type: each course_template (e.g. "botulinum") has up to four
-- LW courses behind it: an Onlinekurs, a Praxiskurs, a Kombikurs, a
-- Hybrid. Each has its own LW slug. legacy_bookings.product_name for
-- LW imports is already the right slug, but for HubSpot imports it's
-- the German marketing display ("Onlinekurs medizinische Hautpflege"),
-- which doesn't resolve to a URL on its own. Storing the slugs on the
-- template lets us hand off a clean URL regardless of import source.
--
-- Praxiskurs slugs are usually session-specific (date-tagged like
-- grundkurs-botulinum-praxiskurs-21062025); we still store the most
-- recent one as a "default" so the dashboard has something to point
-- at, but the customer-facing UX prefers the date-tagged one from
-- their own legacy_bookings row when present.

ALTER TABLE public.course_templates
  ADD COLUMN IF NOT EXISTS lw_slug_online text,
  ADD COLUMN IF NOT EXISTS lw_slug_praxis text,
  ADD COLUMN IF NOT EXISTS lw_slug_kombi  text,
  ADD COLUMN IF NOT EXISTS lw_slug_hybrid text;

-- Helper: strip a LW slug down to its bare course key so it can be
-- joined against course_templates.course_key. Order matters: the date
-- suffix is always last, the type suffix sits between date and core,
-- and the level prefix is at the front.
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
  -- Type suffix.
  s := regexp_replace(
    s,
    '-(praxiskurs|praxis-kurs|onlinekurs|online-kurs|kombikurs|kombi-kurs|hybrid)$',
    ''
  );
  -- Level prefix.
  s := regexp_replace(s, '^(grundkurs|aufbaukurs)-', '');
  RETURN nullif(s, '');
END;
$$;

-- Helper: detect course type from a slug. Mirrors the TS deriveCourseType
-- in /mein-konto/page.tsx so the matcher stays consistent across SQL
-- and the app server.
CREATE OR REPLACE FUNCTION public.lw_course_type(slug text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  s text := lower(coalesce(slug, ''));
BEGIN
  IF s ~ 'praxiskurs|praxis-kurs' THEN RETURN 'praxis';
  ELSIF s ~ 'kombikurs|kombi-kurs' THEN RETURN 'kombi';
  ELSIF s ~ 'hybrid' THEN RETURN 'hybrid';
  ELSIF s ~ 'online' THEN RETURN 'online';
  -- A 6+ digit run on a bare slug typically means a date-tagged
  -- praxis session (grundkurs-botulinum-21062025).
  ELSIF s ~ '\d{6,}' THEN RETURN 'praxis';
  ELSE RETURN 'online';
  END IF;
END;
$$;

-- ── Backfill lw_slug_online from LW imports.
-- For online courses, every LW row maps to the same canonical slug per
-- template, so we just take any matching slug (DISTINCT ON the bare
-- course_key). The product_name IS the slug.
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

-- ── Backfill lw_slug_praxis (most recent date-tagged slug wins).
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

-- ── Backfill lw_slug_kombi.
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

-- ── Backfill lw_slug_hybrid.
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

COMMENT ON COLUMN public.course_templates.lw_slug_online IS
  'Canonical LearnWorlds slug for the Onlinekurs variant. Used to build https://learn.ephia.de/course/<slug> for /mein-konto CTAs when the legacy_bookings row does not already carry the slug (HubSpot imports).';
COMMENT ON COLUMN public.course_templates.lw_slug_praxis IS
  'Most recent LearnWorlds slug for the Praxiskurs variant. Praxiskurs slugs are usually date-tagged per session; the dashboard prefers the per-row slug from legacy_bookings when set.';
COMMENT ON COLUMN public.course_templates.lw_slug_kombi IS
  'LearnWorlds slug for the Kombikurs variant. Same date-tagging caveat as praxis.';
COMMENT ON COLUMN public.course_templates.lw_slug_hybrid IS
  'LearnWorlds slug for the Hybrid variant. Same caveat as praxis/kombi.';
