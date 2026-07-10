-- Aufbaukurs Biostimulation & Skinbooster: LÄK-Berlin-Akkreditierung ist
-- durch (Anerkennungsbescheid vom 10.07.2026, Kategorie C, 12 CME-Punkte).
-- Vorher stand hier "CME beantragt" (Migration 129) und die Karte zeigte
-- keinen CME-Badge, weil die Biostimulation-Karte cme_praxis liest, nicht
-- cme_kombi.
--
-- Der Kurs ist praxis-only: die einzelne Buchungskarte ist die
-- Praxiskurs-Karte, die course_templates.cme_praxis rendert
-- (course-cards-page.tsx). Wir setzen daher cme_praxis auf den
-- akkreditierten Wert und ziehen das veraltete "CME beantragt" aus
-- cme_kombi nach, damit kein Rest-"beantragt" irgendwo durchschlägt.
--
-- Die VNR pro Termin (LÄK Berlin) wird NICHT hier gesetzt, sondern pro
-- course_sessions-Zeile über den Zertifikatgenerator/Kurstermine-Editor
-- gepflegt (course_sessions.vnr_praxis). Für den Termin 19.07.2026 lautet
-- die VNR 2761102026035770004.

update public.course_templates
  set cme_praxis = '12 CME',
      cme_kombi = '12 CME'
  where course_key = 'aufbaukurs_skulptra';
