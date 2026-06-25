-- The Aufbaukurs is titled "Biostimulation & Skinbooster", not "Skulptra"
-- (Skulptra is a product brand, not the seminar name). The landing page,
-- curriculum and FAQ already use the correct title; this fixes the
-- remaining title fields stored on the course_templates row, which drive
-- the home tile (dbTitle), booking confirmations, dashboard and the
-- certificate. course_key stays "aufbaukurs_skulptra" (internal id, not
-- shown to users).
--
-- replace() only touches values that actually contain "Skulptra", so this
-- is a no-op for any column already correct and safe to re-run.

UPDATE public.course_templates
SET
  title           = replace(title,           'Skulptra', 'Biostimulation'),
  course_label_de = replace(course_label_de, 'Skulptra', 'Biostimulation'),
  display_title   = replace(display_title,   'Skulptra', 'Biostimulation'),
  name_online     = replace(name_online,     'Skulptra', 'Biostimulation'),
  name_praxis     = replace(name_praxis,     'Skulptra', 'Biostimulation'),
  name_kombi      = replace(name_kombi,      'Skulptra', 'Biostimulation')
WHERE course_key = 'aufbaukurs_skulptra';
