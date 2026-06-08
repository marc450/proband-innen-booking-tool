# Gebrauchsanweisung Admin-Tool für Kursbetreuungen

Dieses Handbuch erklärt Dir die täglichen Aufgaben im EPHIA Admin-Tool (`admin.ephia.de`). Es richtet sich an Kursbetreuungen und deckt die vier wichtigsten Bereiche ab:

1. Status von Proband:innen verwalten
2. Status von Ärzt:innen (Auszubildende) verwalten
3. Eingehende E-Mails von Proband:innen und Ärzt:innen beantworten, auch bei Verspätungen
4. Einführung in unsere wichtigsten AGB für Proband:innen

Melde Dich mit Deinem Mitarbeiter:innen-Account an. Alle hier beschriebenen Bereiche findest Du in der oberen Navigation unter den Gruppen **Proband:innen**, **Auszubildende** und **Einstellungen**.

---

## 1. Status von Proband:innen verwalten

Proband:innen sind die Patient:innen, die in unseren Kursen behandelt werden. Ihre Daten verwaltest Du unter **Proband:innen → Kontakte** (`/dashboard/patients`). Buchungen verwaltest Du unter **Proband:innen → Buchungen** (`/dashboard/bookings`).

Wichtig: Alle persönlichen Daten der Proband:innen sind Ende-zu-Ende-verschlüsselt. Das Tool entschlüsselt sie nur für Dich in der Anzeige, der Speicher bleibt verschlüsselt.

### 1.1 Kontaktstatus (Proband:in-Status)

Jede:r Proband:in hat einen von vier Status. Den Status erkennst Du an der farbigen Plakette in der Spalte **Status**:

| Status | Plakette | Bedeutung |
|---|---|---|
| **Aktiv** | grün | Standard, keine Einschränkung |
| **Warnung** | gelb | Auffällig (z. B. mehrere No-Shows), nur ein Hinweis für Dich, blockiert nichts |
| **Blacklist** | rot | Sperrt jede zukünftige Buchung mit dieser E-Mail oder Telefonnummer |
| **Inaktiv (keine E-Mails)** | grau | Hat sich von Kampagnen-Mails abgemeldet, erhält keine Werbe-Mails mehr (Buchungsbestätigungen und Terminänderungen kommen weiterhin) |

**So änderst Du den Status:**

1. Gehe zu **Proband:innen → Kontakte**.
2. Suche die Person in der Liste.
3. Klicke auf die farbige **Status-Plakette** in der Zeile.
4. Wähle im Dropdown den neuen Status. Die Änderung wird sofort gespeichert.

Du kannst den Status auch in der Detailansicht einer Person ändern: Klicke auf die Zeile, dann auf die Plakette in der Namens-Karte oben links.

**Was die Status konkret bewirken:**

- **Blacklist** ist die einzige harte Sperre. Versucht jemand mit der hinterlegten E-Mail oder Telefonnummer erneut zu buchen, lehnt das System die Buchung automatisch ab. Setze diesen Status nur bei wiederholtem, klar unzuverlässigem Verhalten oder auf Anweisung.
- **Warnung** sperrt nichts. Nutze ihn, um Kolleg:innen zu signalisieren, dass jemand auffällig war.
- **Inaktiv** betrifft nur Kampagnen-Mails, nicht das Buchen.

### 1.2 Kontakte pflegen

In der Detailansicht (`/dashboard/patients/[id]`) kannst Du:

- **Name, E-Mail, Telefon und Adresse** bearbeiten (Stift-Symbol, speichert automatisch beim Verlassen des Feldes)
- **Notizen** hinterlegen (Stift-Symbol an der Notizen-Überschrift, hier musst Du aktiv auf Speichern klicken)
- Eine Statistik sehen: Anzahl Buchungen, Erschienen, No-Shows

In der Listenansicht kannst Du außerdem neue Kontakte anlegen (**+ Neuer Kontakt**), Kontakte aus Excel importieren (**Import Excel**) und Kontakte löschen (Papierkorb-Symbol). Beim Löschen werden alle zugehörigen Buchungen mit entfernt, das lässt sich nicht rückgängig machen.

### 1.3 Buchungsstatus der Proband:innen

Unter **Proband:innen → Buchungen** verwaltest Du den Status einzelner Termine. Jede Buchung hat einen von vier Status:

| Status | Plakette | Bedeutung |
|---|---|---|
| **Gebucht** | blau | Termin steht, noch nicht stattgefunden |
| **Erschienen** | grau | Person war da |
| **No-Show** | rot | Nicht erschienen, löst die Ausfallgebühr aus |
| **Storniert** | Umriss | Termin abgesagt, Person wird per E-Mail benachrichtigt |

**So änderst Du einen Buchungsstatus:**

1. Klicke auf die Status-Plakette der Buchung.
2. Wähle den neuen Status.

Wechsel zwischen **Gebucht**, **Erschienen** und zurück passieren still und sofort. Zwei Status haben besondere Folgen und fragen vorher nach:

- **No-Show setzen:** Es erscheint ein Bestätigungsdialog "No-Show bestätigen". Bestätigst Du, wird automatisch eine Ausfallgebühr von **50,00 EUR** über die hinterlegte Zahlungsmethode (Stripe) berechnet. Diese Aktion kann nicht rückgängig gemacht werden. Nach erfolgreicher Abbuchung erscheint eine grüne Plakette **Belastet**. Setze No-Show erst, wenn der Termin wirklich verstrichen und die Person nicht erschienen ist.
- **Stornieren:** Es erscheint der Dialog "Buchung stornieren". Bei Bestätigung wird der/die Proband:in automatisch per Storno-E-Mail benachrichtigt. Nutze immer "Storniert" (nicht Löschen), wenn die Person informiert werden soll.

**Termin verschieben:** Über das Symbol mit den zwei Pfeilen kannst Du eine Buchung auf einen anderen Kurs, ein anderes Datum oder einen anderen Slot umbuchen. Der/die Proband:in erhält automatisch eine E-Mail mit dem neuen Termin.

**Löschen** (Papierkorb) entfernt die Buchung ohne jede Benachrichtigung. Nutze das nur für Test- oder Dubletten-Einträge, nie als Ersatz für eine Stornierung.

---

## 2. Status von Ärzt:innen (Auszubildende) verwalten

Die Ärzt:innen sind unsere Auszubildenden, die Kurse buchen. Ihre Buchungen verwaltest Du unter **Auszubildende → Buchungen** (`/dashboard/auszubildende/buchungen`). Anders als bei Proband:innen sind diese Daten nicht verschlüsselt.

### 2.1 Buchungsstatus der Ärzt:innen

| Status | Plakette | Bedeutung |
|---|---|---|
| **Gebucht** | blau | Kurs gebucht und bezahlt |
| **Erschienen** | grün | Hat am Kurs teilgenommen. Löst den Versand des Zertifikats aus, siehe Hinweis unten. |
| **Storniert** | rot | Buchung abgesagt |
| **Erstattet** | Umriss | Betrag zurückerstattet |

**So änderst Du den Status:**

1. Klicke auf die Status-Plakette in der Buchungszeile.
2. Wähle den neuen Status. Direkt von "Gebucht" auf "Erstattet" geht nicht, das läuft immer über "Storniert".

**Wichtig: "Erschienen" setzen, sonst kein Zertifikat.** War eine Ärzt:in beim Kurs da, musst Du die Buchung unbedingt auf **Erschienen** setzen. Nur Buchungen mit dem Status "Erschienen" lösen den Versand des Teilnahme- bzw. CME-Zertifikats aus (Praxiskurs, Kombikurs und Komplettpaket, nicht Onlinekurs). Der Standard-Status "Gebucht" reicht nicht. Vergisst Du das, bekommt die Ärzt:in ihr Zertifikat nie. Der Versand läuft automatisch über einen täglichen Lauf, Du kannst die Buchung also auch ein paar Tage nach dem Kurs noch auf "Erschienen" setzen. Fehlt für einen CME-Kurs noch die VNR, wartet das System und verschickt das Zertifikat automatisch, sobald die VNR eingetragen ist. Umgekehrt gilt: Ein CME-Zertifikat ist ein Landesärztekammer-relevantes Dokument, setze "Erschienen" deshalb nie für eine Person, die nicht da war.

**Stornieren einer Ärzt:innen-Buchung:** Hier erscheint ein Bestätigungsdialog, der genau auflistet, was passiert:

- Stripe-Rückerstattung wird ausgelöst (wenn ein Betrag bezahlt wurde)
- Eine Gutschrift wird erstellt
- Eine Stornierungs-E-Mail geht an die Person
- Der Platz im Kurs wird wieder frei

Der Sitzplatzbestand wird dabei automatisch angepasst (frei werdender Platz wird zurückgegeben, beim Reaktivieren wieder belegt).

### 2.2 Suchen und Filtern

In der Buchungsliste kannst Du nach **Name oder E-Mail** suchen und nach **Kurstyp** (Onlinekurs, Praxiskurs, Kombikurs, Komplettpaket), **Kurs**, **Kursdatum**, **Kaufdatum** und **Status** filtern. Mit **Reset** setzt Du alle Filter zurück.

Steht bei einer Buchung **Profil unvollständig**, hat die Person ihr Profil nach dem Kauf noch nicht ausgefüllt. Über das Link-Symbol kopierst Du den Profil-Link und kannst ihn der Person schicken.

### 2.3 Kurstermine und Deine Zuständigkeit

Kurstermine werden unter **Einstellungen → Kurstermine** (`/dashboard/settings?tab=kurstermine`) verwaltet. Jeder Termin (Session) hat unter anderem ein Feld **Kursbetreuung**. Dort wird die zuständige Kursbetreuung pro Termin zugewiesen. So siehst Du, für welche Termine Du verantwortlich bist. Filtere die Liste nach **Kursbetreuung**, um nur Deine Termine zu sehen.

Weitere Felder pro Termin: Status (**Live**/**Offline**), Datum, Startzeit, Dauer, Dozent:in, gebuchte und maximale Plätze sowie der CME-Status. Jede Änderung muss im Dialog **"Änderung bestätigen"** mit **Speichern** bestätigt werden.

### 2.4 Bewertungen

Unter **Auszubildende → Bewertungen** (`/dashboard/auszubildende/bewertungen`) verwaltest Du die öffentlichen Kursbewertungen. Du kannst sie nach **Alle**, **Wartend** und **Freigeschaltet** filtern, einer Bewertung einen Kurs zuordnen, sie freischalten oder ausblenden und löschen.

---

## 3. E-Mails von Proband:innen und Ärzt:innen beantworten

Alle eingehenden E-Mails an `customerlove@ephia.de` landen in der **Inbox** (`/dashboard/inbox`, mobil unter `/m/inbox`). Hier beantwortest Du Anfragen von Proband:innen und Ärzt:innen, zum Beispiel wenn sich jemand verspätet.

### 3.1 Inbox-Aufbau

Links siehst Du die Liste der Konversationen mit Filtertabs:

- **Alle**, **Ungelesen**, **Meine** (Dir zugewiesen), **Beantwortet**, **Spam**

Erkennungszeichen in der Liste:

- **Blauer Punkt** links: ungelesen
- **Grüner Hintergrund** und Plakette **Beantwortet**: bereits beantwortet
- **Farbige Initialen-Plakette**: die Konversation ist einer Person zugewiesen
- **Entwurf** (gelbe Plakette): es gibt einen noch nicht gesendeten Antwortentwurf

Über die Suche oben durchsuchst Du den Posteingang nach Namen, E-Mail oder Inhalt.

### 3.2 Eine Nachricht lesen und beantworten

1. Klicke links auf die Konversation. In der Mitte siehst Du den ganzen Verlauf.
2. Klicke unten auf **Antworten**.
3. Das Feld **An** ist bereits mit der richtigen Empfängeradresse vorbefüllt. Du kannst sie anpassen. Bei Bedarf blendest Du über die Links **CC** oder **BCC** weitere Empfänger ein.
4. Schreibe Deine Antwort in den Editor. Deine Signatur wird automatisch angehängt. Über die Vorlagen kannst Du fertige Textbausteine einfügen.
5. Optional: Hänge Dateien an (per Drag and Drop oder über das Büroklammer-Symbol).
6. Klicke auf **Senden** (oder Cmd/Strg + Enter).

Die Antwort geht von `customerlove@ephia.de` raus und wird im selben Thread eingehängt. An jeder von uns gesendeten Nachricht steht später, wer sie geschickt hat, sodass im Team nachvollziehbar ist, wer geantwortet hat.

Entwürfe werden automatisch gespeichert, während Du tippst, und tauchen mit der Plakette **Entwurf** wieder auf, wenn Du den Thread erneut öffnest.

### 3.3 Konversation zuweisen

Damit nichts doppelt oder gar nicht bearbeitet wird, kannst Du eine Konversation einer Person zuweisen:

1. Öffne den Thread.
2. Klicke oben rechts auf **Zuweisen** (oder die vorhandene Zuweisungs-Plakette).
3. Wähle die Kollegin oder den Kollegen. Diese Person bekommt eine Slack-Nachricht mit Link zum Thread.

Über **Zuweisung entfernen** machst Du das rückgängig. Mit dem Filter **Meine** siehst Du nur die Dir zugewiesenen Konversationen.

### 3.4 Verspätungen und kurzfristige Absagen

Es gibt keinen eigenen "Verspätet"-Status. Wenn sich jemand per E-Mail meldet, gehst Du so vor:

**Proband:in meldet Verspätung oder kurzfristige Absage:**

1. In der Inbox die E-Mail öffnen und freundlich antworten (siehe AGB-Hinweise unten zur 48-Stunden-Regel).
2. Prüfe, ob der Termin noch zu halten ist. Wenn nötig, verschiebe die Buchung unter **Proband:innen → Buchungen** über das Umbuchen-Symbol auf einen passenden Slot am selben Kurstag.
3. Erscheint die Person trotz Ankündigung gar nicht und liegt die Absage innerhalb von 48 Stunden, setze die Buchung erst nach dem Termin auf **No-Show** (löst die 50-EUR-Gebühr aus). Bei rechtzeitiger oder kulanter Absage stattdessen **Storniert**.
4. Markiere den Thread als erledigt.

**Ärzt:in meldet Verspätung:**

1. E-Mail beantworten und informieren, dass der Kurs auf sie wartet bzw. wie der Ablauf ist.
2. Bei Bedarf die zuständige Dozent:in oder Kursbetreuung des Termins informieren.
3. Nach Klärung den Thread als beantwortet markieren.

**Per Telefon erledigt?** Hat sich die Sache telefonisch geklärt, öffne den Thread und klicke auf **Als beantwortet markieren**. Dann erscheint die Plakette "Markiert von [Dein Name]". Über **Entfernen** kannst Du die Markierung zurücknehmen.

### 3.5 Mobil arbeiten

Unter `/m/inbox` hast Du dieselben Funktionen mobil: Threads öffnen, zuweisen, antworten und senden. In der Liste löschst Du einen Thread per Wischen nach links.

---

## 4. Einführung in unsere wichtigsten AGB für Proband:innen

Jede:r Proband:in bestätigt bei der Buchung unsere Allgemeinen Teilnahmebedingungen. Die vollständige Fassung steht öffentlich unter **https://ephia.de/proband-agb** und wird in jeder Buchungsbestätigung verlinkt. Du solltest die wichtigsten Punkte kennen, weil sie immer wieder Thema in E-Mails sind. Hier die Kurzfassung:

**§1 Kein Anspruch auf Behandlung.** Eine Buchung garantiert keine Behandlung. Die behandelnde Ärzt:in entscheidet über Art und Umfang und darf auch kurzfristig aus medizinischen oder organisatorischen Gründen ablehnen. Wird ein Kurs mangels Teilnehmer:innen abgesagt, geschieht das spätestens 3 Tage vorher.

**§2 Behandelnde Personen und Verantwortung.** Behandelt wird ausschließlich von selbstständigen, approbierten Ärzt:innen oder Zahnärzt:innen unter Aufsicht qualifizierter Dozent:innen. Der Behandlungsvertrag besteht zwischen Ärzt:in und Proband:in. EPHIA ist nicht Behandlerin, sondern übernimmt nur die Organisation.

**§3 Aufklärung und Einwilligung.** Vor jeder Behandlung klärt die Ärzt:in auf. Es braucht eine schriftliche Einwilligung. Proband:innen dürfen jederzeit ohne Begründung ablehnen.

**§4 Behandlungsergebnis.** Es handelt sich um ärztliche Fortbildungen zu Ausbildungszwecken. Ein bestimmtes ästhetisches Ergebnis wird nicht garantiert, Abweichungen sind kein Mangel. Kostenfreie Nachbehandlungen gibt es nicht pauschal.

**§5 Verbindlichkeit, Stornierung und No-Show-Gebühr.** Das ist der wichtigste Punkt für Deinen Alltag:
- Die Buchung ist verbindlich.
- Kostenfreie Stornierung ist bis **48 Stunden vor dem Termin** in Textform möglich (z. B. per E-Mail an customerlove@ephia.de oder über das Buchungsportal).
- Bei Absage unter 48 Stunden oder Nichterscheinen wird eine **Ausfallgebühr von 50 EUR** erhoben. Dem genau entspricht die No-Show-Funktion im Tool.
- Bei wiederholt unzuverlässigem Verhalten darf EPHIA Proband:innen vom Programm ausschließen (entspricht dem Status **Blacklist**).

**§6 Terminänderung durch EPHIA.** Wir dürfen Zeitfenster innerhalb desselben Kurstages umlegen oder eine Buchung stornieren, wenn sonst Lücken im Kursablauf entstehen, Stornierung spätestens 3 Tage vorher und immer mit E-Mail-Info. Aufwendungen wie Anreisekosten werden nicht ersetzt.

**§7 Vorbereitung auf die Behandlung.** Proband:innen verpflichten sich u. a. zu: kein Alkohol oder Drogen 24 Stunden vorher, keine blutverdünnenden Medikamente (soweit medizinisch vertretbar), ungeschminktes Erscheinen bei Gesichtsbehandlungen, frisch gereinigte Haut, pünktliches Erscheinen (mindestens 10 Minuten vorher). Werden diese Hinweise nicht eingehalten, kann die Behandlung abgelehnt werden.

**§8 Kosten und Abrechnung.** Die angezeigten Richtpreise sind nur Orientierung. Der genaue Umfang und die Kosten werden im Aufklärungsgespräch festgelegt, abgerechnet wird nach GOÄ. Bezahlt wird nach der Behandlung vor Ort. Die bei der Buchung hinterlegte Zahlungsmethode dient nur der Absicherung der Ausfallgebühr.

**§9 Gesundheitszustand und Mitwirkung.** Proband:innen müssen die Ärzt:in vorher vollständig und wahrheitsgemäß über ihren Gesundheitszustand informieren (Vorerkrankungen, Allergien, Medikation, Schwangerschaft oder Stillzeit). Unvollständige Angaben berechtigen zur Ablehnung der Behandlung.

**Häufige Rückfragen und wie Du antwortest:**

- "Kann ich kostenlos stornieren?" → Ja, bis 48 Stunden vorher, danach 50 EUR (§5).
- "Warum wurde mir eine Gebühr berechnet?" → No-Show oder Absage unter 48 Stunden, vorab in den AGB zugestimmt (§5).
- "Bekomme ich auf jeden Fall eine Behandlung?" → Nein, die Ärzt:in entscheidet medizinisch (§1, §3).
- "Garantiert ihr das Ergebnis?" → Nein, Ausbildungskontext, kein garantiertes Ergebnis (§4).

Für die ausführliche Antwort verweise immer auf **https://ephia.de/proband-agb**.

---

*Bei Unsicherheiten oder Sonderfällen (z. B. Blacklist setzen, Kulanz bei der Ausfallgebühr) bitte Rücksprache mit dem Team halten.*
