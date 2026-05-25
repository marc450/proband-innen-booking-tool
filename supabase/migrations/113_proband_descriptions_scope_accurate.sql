-- 113_proband_descriptions_scope_accurate.sql
--
-- Refines the texts that migration 112 wrote with the scope-specific
-- details that were in the original DB copy (Galderma branding,
-- Skinbooster vs Sculptra distinction + four mögliche Zonen, named
-- Beispiel-Indikationen). Migration 112 ersetzte den alten Text durch
-- juristisch saubere, aber generische Vorlagen. 113 bringt die alten
-- Scope-Details zurueck, sodass Proband:innen wieder lesen koennen,
-- was im jeweiligen Kurs konkret behandelt wird.
--
-- Was bleibt: 1) die Lawyer-Prinzipien aus 111/112 (kein "Marktwert",
-- kein "wir behandeln", keine pauschale Erfolgszusage, "approbierte:n,
-- freiberuflich taetige:n Aerzt:in"); 2) "Du" mit grossem D, gendered,
-- keine Dashes.

-- ---------------------------------------------------------------------
-- Aufbaukurs Lippen: Galderma-Brand wieder dazu (Bestandteil der
-- inhaltlichen Differenzierung gegenueber generischem Hyaluron).
-- ---------------------------------------------------------------------
WITH new_copy AS (
  SELECT
    'Im Rahmen dieses Kurses kannst Du eine Behandlung der Lippen mit hochwertigem Dermalfiller (Hyaluronsäure, z. B. von Galderma) durch eine:n approbierte:n, freiberuflich tätige:n Ärzt:in erhalten. Im Aufklärungsgespräch wird gemeinsam mit den Dozent:innen festgelegt, welcher Behandlungsumfang zu Deiner Ausgangssituation und Deinen Wünschen passt. Das Ergebnis soll natürlich wirken, mit erhaltener Lippenform und Mimik. In vielen Praxen liegen die Preise für eine vergleichbare Behandlung deutlich über unserem Richtpreis.' AS service_description
)
UPDATE public.course_templates ct
SET service_description = nc.service_description
FROM new_copy nc
WHERE ct.course_key = 'aufbaukurs_lippen';

WITH new_copy AS (
  SELECT
    'Im Rahmen dieses Kurses kannst Du eine Behandlung der Lippen mit hochwertigem Dermalfiller (Hyaluronsäure, z. B. von Galderma) durch eine:n approbierte:n, freiberuflich tätige:n Ärzt:in erhalten. Im Aufklärungsgespräch wird gemeinsam mit den Dozent:innen festgelegt, welcher Behandlungsumfang zu Deiner Ausgangssituation und Deinen Wünschen passt. Das Ergebnis soll natürlich wirken, mit erhaltener Lippenform und Mimik. In vielen Praxen liegen die Preise für eine vergleichbare Behandlung deutlich über unserem Richtpreis.' AS service_description
)
UPDATE public.courses c
SET service_description = nc.service_description
FROM new_copy nc, public.course_templates ct
WHERE c.template_id = ct.id
  AND ct.course_key = 'aufbaukurs_lippen';

-- ---------------------------------------------------------------------
-- Aufbaukurs Biostimulation & Skinbooster: Skinbooster vs Sculptra
-- wieder explizit benennen plus die vier moeglichen Zonen (Gesicht,
-- Hals, Haende, Dekollete). Wirkmechanismen weich formuliert: Sculptra
-- "kann zu schrittweisem Volumenaufbau beitragen" statt "sorgt für
-- langfristigen Volumenaufbau ... natürliches Lifting". "Marktwert
-- ... 850 €" bleibt raus.
-- ---------------------------------------------------------------------
WITH new_copy AS (
  SELECT
    'Im Rahmen dieses Kurses kannst Du zwei Behandlungen durch eine:n approbierte:n, freiberuflich tätige:n Ärzt:in erhalten: eine mit Skinbooster und eine mit Sculptra. Behandelt werden je nach Auswahl Gesicht, Hals, Hände oder Dekolleté. Gemeinsam mit unseren Dozent:innen wählst Du zwei passende Zonen aus, abgestimmt auf Deine Ausgangssituation. Skinbooster zielen auf die Hauthydratation und Hautqualität ab. Sculptra regt die körpereigene Kollagenbildung an und kann zu einem schrittweisen Volumenaufbau beitragen. In vielen Praxen liegen die Preise für eine vergleichbare Behandlung deutlich über unserem Richtpreis.' AS service_description
)
UPDATE public.course_templates ct
SET service_description = nc.service_description
FROM new_copy nc
WHERE ct.course_key = 'aufbaukurs_skulptra';

WITH new_copy AS (
  SELECT
    'Im Rahmen dieses Kurses kannst Du zwei Behandlungen durch eine:n approbierte:n, freiberuflich tätige:n Ärzt:in erhalten: eine mit Skinbooster und eine mit Sculptra. Behandelt werden je nach Auswahl Gesicht, Hals, Hände oder Dekolleté. Gemeinsam mit unseren Dozent:innen wählst Du zwei passende Zonen aus, abgestimmt auf Deine Ausgangssituation. Skinbooster zielen auf die Hauthydratation und Hautqualität ab. Sculptra regt die körpereigene Kollagenbildung an und kann zu einem schrittweisen Volumenaufbau beitragen. In vielen Praxen liegen die Preise für eine vergleichbare Behandlung deutlich über unserem Richtpreis.' AS service_description
)
UPDATE public.courses c
SET service_description = nc.service_description
FROM new_copy nc, public.course_templates ct
WHERE c.template_id = ct.id
  AND ct.course_key = 'aufbaukurs_skulptra';

-- ---------------------------------------------------------------------
-- Aufbaukurs Therapeutische Indikationen Botulinum: ergaenzt um den
-- expliziten "individuellen Behandlungsplan" wie im Original-Text.
-- Pauschale Erfolgszusage ("sichere, effektive Symptomlinderung") raus.
-- ---------------------------------------------------------------------
WITH new_copy AS (
  SELECT
    'Im Rahmen dieses Kurses kannst Du eine Behandlung medizinischer Beschwerden mit Botulinum durch eine:n approbierte:n, freiberuflich tätige:n Ärzt:in erhalten. Welche Indikation behandelt wird (z. B. Bruxismus, Hyperhidrose oder chronische Spannungskopfschmerzen) und ob eine Behandlung medizinisch sinnvoll ist, wird im Aufklärungsgespräch mit den Dozent:innen geprüft und in einem individuellen Behandlungsplan festgehalten. In vielen Praxen liegen die Preise für eine vergleichbare Behandlung deutlich über unserem Richtpreis.' AS service_description
)
UPDATE public.course_templates ct
SET service_description = nc.service_description
FROM new_copy nc
WHERE ct.course_key = 'aufbaukurs_therapeutische_indikationen_botulinum';

WITH new_copy AS (
  SELECT
    'Im Rahmen dieses Kurses kannst Du eine Behandlung medizinischer Beschwerden mit Botulinum durch eine:n approbierte:n, freiberuflich tätige:n Ärzt:in erhalten. Welche Indikation behandelt wird (z. B. Bruxismus, Hyperhidrose oder chronische Spannungskopfschmerzen) und ob eine Behandlung medizinisch sinnvoll ist, wird im Aufklärungsgespräch mit den Dozent:innen geprüft und in einem individuellen Behandlungsplan festgehalten. In vielen Praxen liegen die Preise für eine vergleichbare Behandlung deutlich über unserem Richtpreis.' AS service_description
)
UPDATE public.courses c
SET service_description = nc.service_description
FROM new_copy nc, public.course_templates ct
WHERE c.template_id = ct.id
  AND ct.course_key = 'aufbaukurs_therapeutische_indikationen_botulinum';
