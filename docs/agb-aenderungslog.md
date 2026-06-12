# AGB Änderungslog & offene Punkte

Zentrale Stelle für (a) die Historie der AGB-Änderungen und (b) die
Sammlung offener Punkte, die bei der nächsten juristischen Prüfung der
AGB mitgenommen werden sollen.

Deckt AGB **und** Datenschutzerklärung ab.

Betroffene Dokumente, die bei Änderungen **synchron** gehalten werden
müssen:

- `src/app/kurse/agb/page.tsx` — Kurs-AGB für Ärzt:innen (öffentlich, `ephia.de/agb`)
- `src/app/kurse/proband-agb/page.tsx` — AGB für Proband:innen (öffentlich)
- `src/app/book/booking-form.tsx` + `src/app/book/privat/booking-form.tsx` — Inline-AGB im Buchungsfunnel (muss mit der Proband-AGB übereinstimmen)
- `src/app/kurse/datenschutz/page.tsx` — Datenschutzerklärung (öffentlich, `ephia.de/datenschutz`)

> Hinweis: Die AGB sind rechtlicher Text. Alle hier dokumentierten
> Formulierungen sind fachlich/redaktionell umgesetzt, aber **nicht
> anwaltlich geprüft**. Vor einer belastbaren Außenwirkung sollte eine
> juristische Prüfung erfolgen.

---

## Änderungshistorie

### 2026-06-12 — Storno & Umbuchung Praxiskurse (Ziffer 6 Kurs-AGB)

Datei: `src/app/kurse/agb/page.tsx`, Abschnitt „6. Rücktritt, Umbuchung & Stornierung".

Geändert von der bisherigen Regelung (kostenfreie Stornierung bis 14
Tage, Umbuchung bis 7 Tage gegen max. 10 % des Kurswertes) auf:

- **Fristberechnung neu definiert:** Maßgeblich ist der Kursbeginn
  (Datum + Uhrzeit). Ein Tag = 24 Stunden, rückwärts ab Kursbeginn
  gerechnet.
- **Bis 14 Tage vor Kursbeginn:** kostenfreie Stornierung ohne weitere
  Folgen, volle Rückerstattung. Danach Stornierung mit Rückerstattung
  ausgeschlossen.
- **Weniger als 14 Tage vor Kursbeginn (Praxiskurse + Praxisteil von
  Kombikursen):** keine Stornierung mehr und **kein Anspruch** auf
  Umbuchung. EPHIA kann eine einmalige Umbuchung desselben Kurses
  **aus Kulanz** gegen gestaffelte Gebühr gewähren:
  - 14 bis 7 Tage vorher: **125 €**
  - weniger als 7 Tage vorher: **250 €**
- **Krankheitsbedingte Absage:** ebenfalls kein Anspruch; eine
  Umbuchung aus Kulanz setzt zusätzlich voraus, dass der/die Ärzt:in
  sich einverstanden erklärt, ein Attest einer von EPHIA benannten,
  unabhängigen Ärzt:in beizubringen.

  _Update (2026-06-12, Folgeanweisung Marc): Umbuchung ist innerhalb der
  14-Tage-Frist kein Recht mehr, sondern reine Kulanzentscheidung von
  EPHIA gegen die o. g. Gebühr._
- „Stand"-Datum auf der AGB-Seite ergänzt.

Auslöser: Anweisung Marc, 2026-06-12.

### 2026-06-12 — KI-Nutzung für Ärzt:innen-Service erweitert (Datenschutz §8)

Datei: `src/app/kurse/datenschutz/page.tsx`, Abschnitt „8. Einsatz von
KI-gestützten Hilfswerkzeugen".

Bisher war der Abschnitt auf das Verfassen von E-Mail-Entwürfen mit
Anthropic Claude beschränkt. Ergänzt um einen Absatz, der die Nutzung
auf die allgemeine Verbesserung der Service-Qualität für gebuchte
Ärzt:innen ausweitet (Aufbereitung/Zuordnung von Anfragen, Auswahl
passender Kurs- und Lernangebote, Qualitätssicherung). Datenkategorien
unverändert, Proband:innen weiterhin ausgenommen, kein Art.-22-DSGVO-
Automatismus. Rechtsgrundlage (Art. 6 Abs. 1 lit. f, SCC, AVV mit
Anthropic) bleibt bestehen.

Auslöser: Anweisung Marc, 2026-06-12.

---

## Vorbereitet, aber NICHT live (vor Go-live zu veröffentlichen)

### Galderma-Datenweitergabe (Datenschutz + AGB-Hinweis)

Status am 2026-06-12: **bewusst NICHT veröffentlicht.** Der zugehörige
Einwilligungs-Mechanismus (Opt-in-Häkchen der Kursbetreuung,
Bestätigungs-E-Mail mit Widerrufslink, Export an Galderma,
Widerruf-Forwarder) ist im Code **noch nicht gebaut**. Eine
Datenschutz-Klausel zu veröffentlichen, ohne dass Opt-in und Widerruf
tatsächlich funktionieren, wäre selbst ein DSGVO-Verstoß.

Vor Go-live nötig (siehe Memory `project_galderma_data_sharing.md`):

1. Einwilligungs-Mechanismus bauen (Tabellen `partner_data_consents` +
   `partner_data_exports`, Häkchen, Bestätigungs-Mail, Widerruf-Endpoint,
   Export-Button, Widerruf-Forwarder).
2. Datenweitergabe-Vereinbarung EPHIA ↔ Galderma SA (zwei
   Verantwortliche, keine AVV).
3. Formales Zweck-Sign-off durch Galderma.
4. Anwaltliche Prüfung der Datenschutz-Sektion.

Erst danach: neue Sektion in `datenschutz/page.tsx` unter dem Anker
`#partner-datenweitergabe` einsetzen. Fertiger Textentwurf liegt in der
Memory (`project_galderma_data_sharing.md`, Abschnitt
„Datenschutzerklärung Sektion (Entwurf)") und enthält: Empfänger
Galderma SA (Lausanne, Schweiz), Datenkategorien (Name, E-Mail,
absolvierter Kurs), Zweck, Rechtsgrundlage Art. 6 Abs. 1 lit. a,
Drittlandsübermittlung Schweiz (Angemessenheitsbeschluss),
Aufbewahrung, Widerrufsrecht, Beschwerderecht. Nur Auszubildende
(course_bookings, Praxis-/Kombikurse), **nicht** Proband:innen.
Zusätzlich: Transparenz-Hinweis im Praxiskurs-Buchungsflow, dass die
Kurse durch Galderma gesponsert werden (keine Einwilligung, nur
Transparenz).

---

## Offene Punkte für die nächste juristische Prüfung

Diese Punkte sind beim Storno-/Umbuchungs-Update aufgefallen und sollten
mit der nächsten Prüfung adressiert werden:

1. **Krankheit & Gebühr:** Aktuell ist offen, ob eine krankheitsbedingte
   Umbuchung die Umbuchungsgebühr (125/250 €) reduziert oder erlässt
   oder ob die Gebühr zusätzlich zur Attest-Pflicht anfällt. Heute ist
   es so formuliert, dass die Gebühr **bestehen bleibt** und das Attest
   nur **Voraussetzung** für die Umbuchung ist. Bitte gewünschte Logik
   bestätigen.
2. **Attest „nach Wahl von EPHIA":** Die Pflicht, ein Attest einer von
   EPHIA bestimmten, unabhängigen Ärzt:in beizubringen, ist in einer AGB
   (Klauselkontrolle § 307 BGB) potenziell angreifbar. Klären:
   Zumutbarkeit, wer die **Kosten** des Attests trägt, Frist zur
   Vorlage, und ob ein Attest der behandelnden Hausärzt:in als
   Alternative genügt.
3. **„Einmalig":** Umbuchung ist als einmalig formuliert. Bestätigen, ob
   das so gewollt ist oder mehrfach (gegen erneute Gebühr) möglich sein
   soll.
4. **Ersatztermin-Fenster:** Bis wann muss der neue Termin liegen (z. B.
   innerhalb von X Monaten, nur unter aktuell ausgeschriebenen
   Terminen)? Was passiert, wenn kein Ersatztermin verfügbar ist?
5. **No-Show ohne Umbuchung:** Folgen des unentschuldigten
   Nichterscheinens beim Praxiskurs ausdrücklich regeln (Verfall der
   vollen Kursgebühr?).
6. **Umsatzsteuer:** Klarstellen, ob 125/250 € inkl. oder zzgl. USt sind
   (abhängig vom USt-Status der GmbH i.G. / Kleinunternehmerregelung).
7. **Reine Online-Kurse:** Eigene Storno-/Widerrufslogik definieren
   (digitale Inhalte, Auslösung durch Freischaltung). Da sich das
   Angebot an Unternehmer:innen (approbierte Ärzt:innen in
   Berufsausübung) richtet, besteht i. d. R. kein Verbraucher-
   Widerrufsrecht; das sollte aber ausdrücklich klargestellt werden.
8. **GmbH i.G.:** Sobald die GmbH eingetragen ist, „i.G." in allen
   Rechtstexten (AGB, Impressum, Datenschutz) entfernen.
9. **Synchronisation:** Proband-AGB und Inline-AGB im Buchungsfunnel bei
   jeder Änderung gemeinsam aktualisieren (siehe Dokumentenliste oben).
10. **Versionierung:** „Stand"-Datum bei jeder inhaltlichen Änderung
    aktualisieren und hier im Log vermerken.
