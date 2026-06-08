import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Anleitung Kursbetreuung | EPHIA Admin",
};

// In-app Gebrauchsanweisung für Kursbetreuungen. Spiegelt
// docs/kursbetreuung-handbuch.md. Wenn sich Abläufe im Tool ändern,
// beide Stellen aktualisieren.

function StatusTable({
  rows,
}: {
  rows: { status: string; pill: string; meaning: string }[];
}) {
  return (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-2 pr-4 font-medium">Status</th>
            <th className="py-2 pr-4 font-medium">Plakette</th>
            <th className="py-2 font-medium">Bedeutung</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.status} className="border-t border-border align-top">
              <td className="py-2 pr-4 font-medium whitespace-nowrap">
                {r.status}
              </td>
              <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">
                {r.pill}
              </td>
              <td className="py-2 leading-relaxed">{r.meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AnleitungPage() {
  return (
    <article className="max-w-3xl mx-auto px-5 md:px-8 py-10 md:py-16 text-foreground">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zum Dashboard
      </Link>

      <h1 className="text-3xl md:text-4xl font-bold mb-4">
        Anleitung für Kursbetreuungen
      </h1>
      <p className="text-base text-muted-foreground leading-relaxed mb-10">
        Dieses Handbuch erklärt Dir die täglichen Aufgaben im Admin-Tool. Es
        deckt vier Bereiche ab: den Status von Proband:innen verwalten, den
        Status von Ärzt:innen verwalten, eingehende E-Mails beantworten (auch
        bei Verspätungen) und die wichtigsten AGB für Proband:innen. Alle
        Bereiche findest Du in der Navigation unter den Gruppen Proband:innen,
        Auszubildende und Einstellungen.
      </p>

      {/* 1. Proband:innen */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">
          1. Status von Proband:innen verwalten
        </h2>
        <p className="leading-relaxed mb-4">
          Proband:innen sind die Patient:innen, die in unseren Kursen behandelt
          werden. Kontakte verwaltest Du unter{" "}
          <strong>Proband:innen → Kontakte</strong>, Buchungen unter{" "}
          <strong>Proband:innen → Buchungen</strong>. Alle persönlichen Daten
          sind Ende-zu-Ende-verschlüsselt und werden nur für die Anzeige
          entschlüsselt.
        </p>

        <h3 className="text-lg font-semibold mt-6 mb-2">
          Kontaktstatus (Proband:in-Status)
        </h3>
        <StatusTable
          rows={[
            {
              status: "Aktiv",
              pill: "grün",
              meaning: "Standard, keine Einschränkung",
            },
            {
              status: "Warnung",
              pill: "gelb",
              meaning:
                "Auffällig (z. B. mehrere No-Shows), nur ein Hinweis, blockiert nichts",
            },
            {
              status: "Blacklist",
              pill: "rot",
              meaning:
                "Sperrt jede zukünftige Buchung mit dieser E-Mail oder Telefonnummer",
            },
            {
              status: "Inaktiv (keine E-Mails)",
              pill: "grau",
              meaning:
                "Abgemeldet von Kampagnen-Mails, erhält keine Werbe-Mails mehr. Buchungsbestätigungen und Terminänderungen kommen weiterhin.",
            },
          ]}
        />
        <p className="leading-relaxed mb-4">
          <strong>So änderst Du den Status:</strong> In der Kontaktliste auf die
          farbige Status-Plakette in der Zeile klicken und im Dropdown den neuen
          Status wählen. Die Änderung wird sofort gespeichert. Auch in der
          Detailansicht (Klick auf die Zeile) änderbar.
        </p>
        <p className="leading-relaxed mb-4">
          <strong>Blacklist</strong> ist die einzige harte Sperre: Eine erneute
          Buchung mit hinterlegter E-Mail oder Telefonnummer wird automatisch
          abgelehnt. Nur bei wiederholt unzuverlässigem Verhalten oder auf
          Anweisung setzen. <strong>Warnung</strong> sperrt nichts und ist nur
          ein Signal fürs Team. <strong>Inaktiv</strong> betrifft nur
          Kampagnen-Mails, nicht das Buchen.
        </p>

        <h3 className="text-lg font-semibold mt-6 mb-2">Kontakte pflegen</h3>
        <p className="leading-relaxed mb-4">
          In der Detailansicht bearbeitest Du Name, E-Mail, Telefon und Adresse
          (Stift-Symbol, speichert automatisch) sowie Notizen (hier aktiv auf
          Speichern klicken). Du siehst außerdem eine Statistik mit Buchungen,
          Erschienen und No-Shows. In der Liste kannst Du neue Kontakte anlegen,
          aus Excel importieren und Kontakte löschen. Beim Löschen werden alle
          zugehörigen Buchungen mit entfernt, das lässt sich nicht rückgängig
          machen.
        </p>

        <h3 className="text-lg font-semibold mt-6 mb-2">
          Buchungsstatus der Proband:innen
        </h3>
        <StatusTable
          rows={[
            {
              status: "Gebucht",
              pill: "blau",
              meaning: "Termin steht, noch nicht stattgefunden",
            },
            { status: "Erschienen", pill: "grau", meaning: "Person war da" },
            {
              status: "No-Show",
              pill: "rot",
              meaning: "Nicht erschienen, löst die Ausfallgebühr aus",
            },
            {
              status: "Storniert",
              pill: "Umriss",
              meaning: "Termin abgesagt, Person wird per E-Mail benachrichtigt",
            },
          ]}
        />
        <p className="leading-relaxed mb-4">
          Status änderst Du per Klick auf die Plakette der Buchung. Wechsel
          zwischen Gebucht, Erschienen und zurück passieren still und sofort.
          Zwei Status haben besondere Folgen:
        </p>
        <ul className="list-disc pl-6 space-y-2 leading-relaxed mb-4">
          <li>
            <strong>No-Show setzen:</strong> Ein Dialog erscheint. Bei
            Bestätigung wird automatisch eine Ausfallgebühr von{" "}
            <strong>50,00 EUR</strong> über die hinterlegte Zahlungsmethode
            berechnet. Das ist nicht rückgängig zu machen. Nach erfolgreicher
            Abbuchung erscheint die Plakette „Belastet“. Erst nach dem Termin
            setzen, wenn die Person wirklich nicht erschienen ist.
          </li>
          <li>
            <strong>Stornieren:</strong> Bei Bestätigung wird der/die Proband:in
            automatisch per Storno-E-Mail benachrichtigt. Immer „Storniert“
            nutzen (nicht Löschen), wenn die Person informiert werden soll.
          </li>
        </ul>
        <p className="leading-relaxed mb-4">
          <strong>Termin verschieben:</strong> Über das Symbol mit den zwei
          Pfeilen buchst Du auf einen anderen Kurs, ein anderes Datum oder einen
          anderen Slot um, die Person erhält automatisch eine E-Mail.{" "}
          <strong>Löschen</strong> (Papierkorb) entfernt die Buchung ohne
          Benachrichtigung, nur für Test- oder Dubletten-Einträge nutzen.
        </p>
      </section>

      {/* 2. Ärzt:innen */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">
          2. Status von Ärzt:innen (Auszubildende) verwalten
        </h2>
        <p className="leading-relaxed mb-4">
          Die Ärzt:innen sind unsere Auszubildenden, die Kurse buchen. Ihre
          Buchungen verwaltest Du unter{" "}
          <strong>Auszubildende → Buchungen</strong>. Anders als bei
          Proband:innen sind diese Daten nicht verschlüsselt.
        </p>
        <StatusTable
          rows={[
            {
              status: "Gebucht",
              pill: "blau",
              meaning: "Kurs gebucht und bezahlt",
            },
            {
              status: "Erschienen",
              pill: "grün",
              meaning:
                "Hat am Kurs teilgenommen. Löst den Versand des Zertifikats aus, siehe Hinweis unten.",
            },
            { status: "Storniert", pill: "rot", meaning: "Buchung abgesagt" },
            {
              status: "Erstattet",
              pill: "Umriss",
              meaning: "Betrag zurückerstattet",
            },
          ]}
        />
        <div className="rounded-[10px] bg-[#0066FF]/10 px-4 py-3 my-4">
          <p className="font-semibold text-[#0066FF] mb-1">
            Wichtig: „Erschienen“ setzen, sonst kein Zertifikat
          </p>
          <p className="leading-relaxed text-sm">
            War eine Ärzt:in beim Kurs da, musst Du die Buchung unbedingt auf{" "}
            <strong>Erschienen</strong> setzen. Nur Buchungen mit dem Status
            „Erschienen“ lösen den Versand des Teilnahme- bzw. CME-Zertifikats
            aus (Praxiskurs, Kombikurs und Komplettpaket, nicht Onlinekurs). Der
            Standard-Status „Gebucht“ reicht nicht. Vergisst Du das, bekommt die
            Ärzt:in ihr Zertifikat nie. Der Versand läuft automatisch über einen
            täglichen Lauf, Du kannst die Buchung also auch ein paar Tage nach
            dem Kurs noch auf „Erschienen“ setzen. Fehlt für einen CME-Kurs noch
            die VNR, wartet das System und verschickt das Zertifikat automatisch,
            sobald die VNR eingetragen ist. Umgekehrt gilt: Ein CME-Zertifikat
            ist ein Landesärztekammer-relevantes Dokument, setze „Erschienen“
            deshalb nie für eine Person, die nicht da war.
          </p>
        </div>
        <p className="leading-relaxed mb-4">
          Status per Klick auf die Plakette ändern. Direkt von „Gebucht“ auf
          „Erstattet“ geht nicht, das läuft immer über „Storniert“. Beim
          Stornieren listet ein Dialog auf, was passiert: Stripe-Rückerstattung,
          Gutschrift, Stornierungs-E-Mail an die Person und Freigabe des
          Kursplatzes. Der Sitzplatzbestand wird automatisch angepasst.
        </p>
        <h3 className="text-lg font-semibold mt-6 mb-2">Suchen und Filtern</h3>
        <p className="leading-relaxed mb-4">
          Du kannst nach Name oder E-Mail suchen und nach Kurstyp, Kurs,
          Kursdatum, Kaufdatum und Status filtern. „Reset“ setzt alle Filter
          zurück. Steht bei einer Buchung „Profil unvollständig“, hat die Person
          ihr Profil nach dem Kauf noch nicht ausgefüllt. Über das Link-Symbol
          kopierst Du den Profil-Link zum Versenden.
        </p>
        <h3 className="text-lg font-semibold mt-6 mb-2">
          Kurstermine und Deine Zuständigkeit
        </h3>
        <p className="leading-relaxed mb-4">
          Kurstermine werden unter <strong>Einstellungen → Kurstermine</strong>{" "}
          verwaltet. Jeder Termin hat ein Feld <strong>Kursbetreuung</strong>,
          über das die zuständige Person zugewiesen wird. Filtere die Liste nach
          Kursbetreuung, um nur Deine Termine zu sehen. Jede Änderung an einem
          Termin muss im Dialog „Änderung bestätigen“ gespeichert werden.
        </p>
        <h3 className="text-lg font-semibold mt-6 mb-2">Bewertungen</h3>
        <p className="leading-relaxed mb-4">
          Unter <strong>Auszubildende → Bewertungen</strong> verwaltest Du die
          öffentlichen Kursbewertungen: filtern (Alle, Wartend, Freigeschaltet),
          einem Kurs zuordnen, freischalten oder ausblenden und löschen.
        </p>
      </section>

      {/* 3. Inbox */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">
          3. E-Mails von Proband:innen und Ärzt:innen beantworten
        </h2>
        <p className="leading-relaxed mb-4">
          Alle eingehenden E-Mails an customerlove@ephia.de landen in der{" "}
          <strong>Inbox</strong>. Links siehst Du die Konversationen mit den
          Tabs Alle, Ungelesen, Meine, Beantwortet und Spam. Ein blauer Punkt
          markiert ungelesen, ein grüner Hintergrund beantwortet, eine
          Initialen-Plakette eine Zuweisung und „Entwurf“ einen noch nicht
          gesendeten Antwortentwurf.
        </p>
        <h3 className="text-lg font-semibold mt-6 mb-2">
          Lesen und antworten
        </h3>
        <ol className="list-decimal pl-6 space-y-2 leading-relaxed mb-4">
          <li>Links auf die Konversation klicken, der Verlauf öffnet sich.</li>
          <li>Unten auf „Antworten“ klicken.</li>
          <li>
            Das Feld „An“ ist vorbefüllt, bei Bedarf anpassen. Über „CC“ oder
            „BCC“ weitere Empfänger einblenden.
          </li>
          <li>
            Antwort schreiben (Signatur wird automatisch angehängt, Vorlagen
            verfügbar), optional Dateien anhängen.
          </li>
          <li>Auf „Senden“ klicken (oder Cmd/Strg + Enter).</li>
        </ol>
        <p className="leading-relaxed mb-4">
          Antworten gehen von customerlove@ephia.de raus und bleiben im selben
          Thread. An jeder gesendeten Nachricht steht, wer sie geschickt hat.
          Entwürfe werden beim Tippen automatisch gespeichert.
        </p>
        <h3 className="text-lg font-semibold mt-6 mb-2">
          Konversation zuweisen
        </h3>
        <p className="leading-relaxed mb-4">
          Damit nichts doppelt bearbeitet wird: Thread öffnen, oben rechts auf
          „Zuweisen“ klicken und eine Person wählen. Diese bekommt eine
          Slack-Nachricht mit Link. Über „Zuweisung entfernen“ rückgängig. Der
          Filter „Meine“ zeigt nur Deine Konversationen.
        </p>
        <h3 className="text-lg font-semibold mt-6 mb-2">
          Verspätungen und kurzfristige Absagen
        </h3>
        <p className="leading-relaxed mb-4">
          Es gibt keinen eigenen „Verspätet“-Status. Wenn sich jemand meldet:
        </p>
        <p className="leading-relaxed mb-2 font-medium">
          Proband:in meldet Verspätung oder kurzfristige Absage:
        </p>
        <ul className="list-disc pl-6 space-y-2 leading-relaxed mb-4">
          <li>In der Inbox freundlich antworten (siehe 48-Stunden-Regel unten).</li>
          <li>
            Prüfen, ob der Termin noch zu halten ist, sonst unter Proband:innen
            → Buchungen über das Umbuchen-Symbol auf einen Slot am selben
            Kurstag verschieben.
          </li>
          <li>
            Erscheint die Person trotz Ankündigung gar nicht und liegt die
            Absage innerhalb von 48 Stunden, nach dem Termin auf{" "}
            <strong>No-Show</strong> setzen (löst die 50-EUR-Gebühr aus). Bei
            rechtzeitiger oder kulanter Absage stattdessen{" "}
            <strong>Storniert</strong>.
          </li>
          <li>Den Thread als erledigt markieren.</li>
        </ul>
        <p className="leading-relaxed mb-2 font-medium">
          Ärzt:in meldet Verspätung:
        </p>
        <ul className="list-disc pl-6 space-y-2 leading-relaxed mb-4">
          <li>Antworten und über den Ablauf informieren.</li>
          <li>
            Bei Bedarf die zuständige Dozent:in oder Kursbetreuung des Termins
            informieren.
          </li>
          <li>Nach Klärung den Thread als beantwortet markieren.</li>
        </ul>
        <p className="leading-relaxed mb-4">
          <strong>Per Telefon erledigt?</strong> Thread öffnen und auf „Als
          beantwortet markieren“ klicken. Es erscheint „Markiert von [Dein
          Name]“, über „Entfernen“ zurücknehmbar. Mobil unter /m/inbox stehen
          dieselben Funktionen bereit.
        </p>
      </section>

      {/* 4. AGB */}
      <section className="mb-4">
        <h2 className="text-2xl font-bold mb-4">
          4. Die wichtigsten AGB für Proband:innen
        </h2>
        <p className="leading-relaxed mb-4">
          Jede:r Proband:in bestätigt bei der Buchung unsere Teilnahmebedingungen.
          Die vollständige Fassung steht unter{" "}
          <a
            href="https://ephia.de/proband-agb"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0066FF] hover:underline"
          >
            ephia.de/proband-agb
          </a>
          . Die wichtigsten Punkte:
        </p>
        <ul className="space-y-3 leading-relaxed mb-6">
          <li>
            <strong>§1 Kein Anspruch auf Behandlung.</strong> Eine Buchung
            garantiert keine Behandlung. Die Ärzt:in entscheidet und darf auch
            kurzfristig ablehnen.
          </li>
          <li>
            <strong>§2 Behandelnde Personen.</strong> Behandelt wird nur durch
            approbierte Ärzt:innen oder Zahnärzt:innen unter Aufsicht von
            Dozent:innen. EPHIA organisiert nur, ist nicht Behandlerin.
          </li>
          <li>
            <strong>§3 Aufklärung und Einwilligung.</strong> Vor jeder
            Behandlung wird aufgeklärt, es braucht eine schriftliche
            Einwilligung, Ablehnung jederzeit möglich.
          </li>
          <li>
            <strong>§4 Behandlungsergebnis.</strong> Ausbildungskontext, kein
            garantiertes ästhetisches Ergebnis, keine pauschalen kostenfreien
            Nachbehandlungen.
          </li>
          <li>
            <strong>§5 Verbindlichkeit, Stornierung und No-Show-Gebühr.</strong>{" "}
            Der wichtigste Punkt: Buchung ist verbindlich. Kostenfreie
            Stornierung bis 48 Stunden vorher in Textform. Bei Absage unter 48
            Stunden oder Nichterscheinen 50 EUR Ausfallgebühr (entspricht der
            No-Show-Funktion). Bei wiederholter Unzuverlässigkeit Ausschluss
            möglich (entspricht Blacklist).
          </li>
          <li>
            <strong>§6 Terminänderung durch EPHIA.</strong> Wir dürfen
            Zeitfenster am selben Kurstag umlegen oder stornieren (spätestens 3
            Tage vorher, mit E-Mail-Info). Kein Ersatz von Anreisekosten.
          </li>
          <li>
            <strong>§7 Vorbereitung.</strong> Kein Alkohol/Drogen 24 Stunden
            vorher, keine Blutverdünner (soweit vertretbar), ungeschminkt bei
            Gesichtsbehandlungen, gereinigte Haut, mindestens 10 Minuten vorher
            da sein.
          </li>
          <li>
            <strong>§8 Kosten und Abrechnung.</strong> Richtpreise sind nur
            Orientierung, Abrechnung nach GOÄ, Bezahlung nach der Behandlung vor
            Ort. Die hinterlegte Zahlungsmethode sichert nur die Ausfallgebühr.
          </li>
          <li>
            <strong>§9 Gesundheitszustand.</strong> Proband:innen müssen
            vollständig und wahrheitsgemäß über ihren Gesundheitszustand
            informieren (Vorerkrankungen, Allergien, Medikation, Schwangerschaft
            oder Stillzeit).
          </li>
        </ul>
        <h3 className="text-lg font-semibold mt-6 mb-2">
          Häufige Rückfragen
        </h3>
        <ul className="list-disc pl-6 space-y-2 leading-relaxed mb-4">
          <li>
            „Kann ich kostenlos stornieren?“ → Ja, bis 48 Stunden vorher, danach
            50 EUR (§5).
          </li>
          <li>
            „Warum wurde mir eine Gebühr berechnet?“ → No-Show oder Absage unter
            48 Stunden, vorab in den AGB zugestimmt (§5).
          </li>
          <li>
            „Bekomme ich auf jeden Fall eine Behandlung?“ → Nein, die Ärzt:in
            entscheidet medizinisch (§1, §3).
          </li>
          <li>
            „Garantiert ihr das Ergebnis?“ → Nein, Ausbildungskontext, kein
            garantiertes Ergebnis (§4).
          </li>
        </ul>
        <p className="leading-relaxed text-muted-foreground">
          Bei Unsicherheiten oder Sonderfällen (z. B. Blacklist setzen, Kulanz
          bei der Ausfallgebühr) bitte Rücksprache mit dem Team halten.
        </p>
      </section>
    </article>
  );
}
