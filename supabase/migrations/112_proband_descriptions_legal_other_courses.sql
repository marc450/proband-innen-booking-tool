-- 112_proband_descriptions_legal_other_courses.sql
--
-- Extends the legal-cleanup from migration 111 (Botulinum Grundkurs)
-- to the remaining proband-bookable Praxiskurse. Same principles per
-- Sonja's review:
--   - kein "Wir behandeln" / "Gemeinsam mit unserer Dozentin" (kein
--     Anschein, EPHIA fuehrt die Behandlung mit durch);
--   - kein "Marktwert" / "rund 300 €" (werbliche Anpreisung,
--     Schnaeppchen-Charakter, Irrefuehrungsrisiko);
--   - keine pauschalen Erfolgszusagen ("Das Ergebnis wirkt ...");
--   - "approbierte:n, freiberuflich taetige:n Aerzt:in" als Behandler:in;
--   - "Du" mit grossem D, gendered mit Doppelpunkt, keine Dashes.
--
-- Bewusst nicht angefasst:
--   - grundkurs_botulinum / grundkurs_botulinum_zahnmedizin (Migration 111)
--   - grundkurs_dermalfiller (von Sonja explizit als ok bestaetigt)
--
-- Marc: bitte vor Ausfuehrung kurz pruefen, ob die Formulierungen
-- inhaltlich zu jedem Kurs passen (Skulptra-Wirkdauer, Lippen-
-- Behandlungsumfang, Indikationsspektrum bei therapeutischem Botulinum).
-- Das hier sind generische Vorlagen, die juristisch sauber sind, aber
-- nichts ueber den jeweiligen Kursinhalt voraussetzen.

-- ---------------------------------------------------------------------
-- Aufbaukurs Lippen (Dermalfiller, Hyaluronsaeure)
-- ---------------------------------------------------------------------
WITH new_copy AS (
  SELECT
    'Im Rahmen dieses Kurses kannst Du eine Behandlung der Lippen mit Dermalfiller (Hyaluronsäure) durch eine:n approbierte:n, freiberuflich tätige:n Ärzt:in erhalten. Im Aufklärungsgespräch wird gemeinsam mit den Dozent:innen festgelegt, welcher Behandlungsumfang zu Deiner Ausgangssituation und Deinen Wünschen passt. Das Ergebnis soll natürlich wirken, mit erhaltener Lippenform und Mimik. In vielen Praxen liegen die Preise für eine vergleichbare Behandlung deutlich über unserem Richtpreis.' AS service_description
)
UPDATE public.course_templates ct
SET service_description = nc.service_description
FROM new_copy nc
WHERE ct.course_key = 'aufbaukurs_lippen';

WITH new_copy AS (
  SELECT
    'Im Rahmen dieses Kurses kannst Du eine Behandlung der Lippen mit Dermalfiller (Hyaluronsäure) durch eine:n approbierte:n, freiberuflich tätige:n Ärzt:in erhalten. Im Aufklärungsgespräch wird gemeinsam mit den Dozent:innen festgelegt, welcher Behandlungsumfang zu Deiner Ausgangssituation und Deinen Wünschen passt. Das Ergebnis soll natürlich wirken, mit erhaltener Lippenform und Mimik. In vielen Praxen liegen die Preise für eine vergleichbare Behandlung deutlich über unserem Richtpreis.' AS service_description
)
UPDATE public.courses c
SET service_description = nc.service_description
FROM new_copy nc, public.course_templates ct
WHERE c.template_id = ct.id
  AND ct.course_key = 'aufbaukurs_lippen';

-- ---------------------------------------------------------------------
-- Aufbaukurs Therapeutische Indikationen Botulinum
-- (z. B. Bruxismus, Hyperhidrose, chronische Spannungskopfschmerzen)
-- ---------------------------------------------------------------------
WITH new_copy AS (
  SELECT
    'Im Rahmen dieses Kurses kannst Du eine Behandlung therapeutischer Indikationen mit Botulinum durch eine:n approbierte:n, freiberuflich tätige:n Ärzt:in erhalten. Welche Indikation behandelt wird (z. B. Bruxismus, Hyperhidrose oder chronische Spannungskopfschmerzen) und ob eine Behandlung medizinisch sinnvoll ist, wird im Aufklärungsgespräch mit den Dozent:innen geprüft. In vielen Praxen liegen die Preise für eine vergleichbare Behandlung deutlich über unserem Richtpreis.' AS service_description
)
UPDATE public.course_templates ct
SET service_description = nc.service_description
FROM new_copy nc
WHERE ct.course_key = 'aufbaukurs_therapeutische_indikationen_botulinum';

WITH new_copy AS (
  SELECT
    'Im Rahmen dieses Kurses kannst Du eine Behandlung therapeutischer Indikationen mit Botulinum durch eine:n approbierte:n, freiberuflich tätige:n Ärzt:in erhalten. Welche Indikation behandelt wird (z. B. Bruxismus, Hyperhidrose oder chronische Spannungskopfschmerzen) und ob eine Behandlung medizinisch sinnvoll ist, wird im Aufklärungsgespräch mit den Dozent:innen geprüft. In vielen Praxen liegen die Preise für eine vergleichbare Behandlung deutlich über unserem Richtpreis.' AS service_description
)
UPDATE public.courses c
SET service_description = nc.service_description
FROM new_copy nc, public.course_templates ct
WHERE c.template_id = ct.id
  AND ct.course_key = 'aufbaukurs_therapeutische_indikationen_botulinum';

-- ---------------------------------------------------------------------
-- Aufbaukurs Biostimulation & Skinbooster (Skulptra/Profhilo o. ae.)
-- ---------------------------------------------------------------------
WITH new_copy AS (
  SELECT
    'Im Rahmen dieses Kurses kannst Du eine Behandlung mit Biostimulator und/oder Skinbooster durch eine:n approbierte:n, freiberuflich tätige:n Ärzt:in erhalten. Welche Präparate und Areale für Dich geeignet sind, wird im Aufklärungsgespräch mit den Dozent:innen festgelegt. Das Ergebnis baut sich schrittweise über mehrere Wochen auf und soll natürlich wirken. In vielen Praxen liegen die Preise für eine vergleichbare Behandlung deutlich über unserem Richtpreis.' AS service_description
)
UPDATE public.course_templates ct
SET service_description = nc.service_description
FROM new_copy nc
WHERE ct.course_key = 'aufbaukurs_skulptra';

WITH new_copy AS (
  SELECT
    'Im Rahmen dieses Kurses kannst Du eine Behandlung mit Biostimulator und/oder Skinbooster durch eine:n approbierte:n, freiberuflich tätige:n Ärzt:in erhalten. Welche Präparate und Areale für Dich geeignet sind, wird im Aufklärungsgespräch mit den Dozent:innen festgelegt. Das Ergebnis baut sich schrittweise über mehrere Wochen auf und soll natürlich wirken. In vielen Praxen liegen die Preise für eine vergleichbare Behandlung deutlich über unserem Richtpreis.' AS service_description
)
UPDATE public.courses c
SET service_description = nc.service_description
FROM new_copy nc, public.course_templates ct
WHERE c.template_id = ct.id
  AND ct.course_key = 'aufbaukurs_skulptra';
