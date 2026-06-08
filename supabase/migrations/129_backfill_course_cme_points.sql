-- Backfill CME points on course_templates so the home-page course cards
-- (and the per-package CME on the landing / CME pages) render a marker.
-- Values taken from the per-course content files. Grundkurs Botulinum
-- (Zahnmedizin) is intentionally left blank (no accredited value yet);
-- Aufbaukurs Skulptra & Skinbooster shows "CME beantragt".
--
-- Already applied to the live DB on 2026-06-08; UPDATEs are idempotent,
-- so re-running is safe.

update public.course_templates
  set cme_online = '7 CME'
  where course_key = 'grundkurs_medizinische_hautpflege';

update public.course_templates
  set cme_kombi = '24 CME', cme_praxis = '13 CME', cme_online = '11 CME'
  where course_key = 'aufbaukurs_lippen';

update public.course_templates
  set cme_online = '10 CME'
  where course_key = 'aufbaukurs_botulinum_periorale_zone';

update public.course_templates
  set cme_kombi = 'CME beantragt'
  where course_key = 'aufbaukurs_skulptra';
