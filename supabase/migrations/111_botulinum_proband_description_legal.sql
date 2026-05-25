-- 111_botulinum_proband_description_legal.sql
--
-- Replaces the Botulinum Proband:innen service description on
-- /werde-proband-in (rendered from courses.service_description, per
-- treatment-list.tsx) with the lawyer-approved version from Sonja's
-- 2026-05 review. Drops the "rund 300 € Marktwert" / "Gemeinsam mit
-- unserer Dozentin" / "Das Ergebnis wirkt …" phrasing that read as
-- werbliche Anpreisung and Erfolgszusage, replacing it with a neutral
-- description focused on Indikation, Dozent:innen-Auswahl und
-- Richtpreis-Kontext.
--
-- Mirrors the change into BOTH course_templates (so future courses
-- created from the Botulinum-Grundkurs templates inherit the new copy)
-- AND every existing courses row linked to those templates (so the
-- public proband listing reflects the new wording immediately).
--
-- Brand rule compliance: keine Bindestriche/Em-Dashes/En-Dashes als
-- Satzzeichen (siehe BRAND_MANUAL.md), "Du" mit großem D, gendered
-- mit Doppelpunkt.

-- Single source of truth for the new copy, kept on a CTE so the
-- template and satellite updates stay in lockstep.
WITH new_copy AS (
  SELECT
    'Im Rahmen dieses Kurses kannst Du eine Behandlung mimischer Falten mit Botulinum durch eine:n approbierte:n, freiberuflich tätige:n Ärzt:in erhalten. Behandelt werden, je nach Ausgangssituation, bis zu drei der unten aufgeführten Zonen. Gemeinsam mit unseren Dozent:innen wählst Du passende Areale aus und es wird ein individueller Behandlungsplan erstellt. Das Ergebnis soll natürlich und harmonisch wirken, mit erhaltener Mimik. In vielen Praxen liegen die Preise für eine entsprechende Behandlung deutlich über unserem Richtpreis.' AS service_description
)
UPDATE public.course_templates ct
SET service_description = nc.service_description
FROM new_copy nc
WHERE ct.course_key IN ('grundkurs_botulinum', 'grundkurs_botulinum_zahnmedizin');

WITH new_copy AS (
  SELECT
    'Im Rahmen dieses Kurses kannst Du eine Behandlung mimischer Falten mit Botulinum durch eine:n approbierte:n, freiberuflich tätige:n Ärzt:in erhalten. Behandelt werden, je nach Ausgangssituation, bis zu drei der unten aufgeführten Zonen. Gemeinsam mit unseren Dozent:innen wählst Du passende Areale aus und es wird ein individueller Behandlungsplan erstellt. Das Ergebnis soll natürlich und harmonisch wirken, mit erhaltener Mimik. In vielen Praxen liegen die Preise für eine entsprechende Behandlung deutlich über unserem Richtpreis.' AS service_description
)
UPDATE public.courses c
SET service_description = nc.service_description
FROM new_copy nc, public.course_templates ct
WHERE c.template_id = ct.id
  AND ct.course_key IN ('grundkurs_botulinum', 'grundkurs_botulinum_zahnmedizin');
