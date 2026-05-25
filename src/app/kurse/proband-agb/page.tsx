import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AGB für Proband:innen | EPHIA",
  description:
    "Allgemeine Teilnahmebedingungen für Proband:innen der EPHIA Medical GmbH. Verbindliche Buchung, Stornierung, No-Show-Gebühr und weitere Regelungen.",
  alternates: { canonical: "https://ephia.de/proband-agb" },
};

type Section = {
  title: string;
  paragraphs: (string | string[])[];
};

// Mirror of the inline AGB the Proband:in accepts inside the booking
// funnel (src/app/book/booking-form.tsx + src/app/book/privat/
// booking-form.tsx). When the inline copy changes, this page must be
// updated in lockstep so the public reference reflects what was
// actually agreed at booking time. Linked from the booking
// confirmation emails so probands can look the conditions up after
// the fact.
const SECTIONS: Section[] = [
  {
    title: "§1 Kein Anspruch auf Behandlung",
    paragraphs: [
      "Die Registrierung bzw. Buchung eines Termins als Proband:in begründet keinen rechtlichen Anspruch auf Durchführung einer Behandlung. Die Auswahl der Proband:innen sowie die Entscheidung über Art und Umfang der Behandlung erfolgt ausschließlich durch die behandelnde Ärzt:in auf Grundlage medizinischer und organisatorischer Kriterien.",
      "Die behandelnde Ärzt:in ist berechtigt, eine Behandlung auch kurzfristig aus medizinischen Gründen abzulehnen, oder wenn organisatorische Gründe entgegenstehen (insbesondere das Nichterreichen der für die Weiterbildungsveranstaltung erforderlichen Mindestanzahl an Proband:innen; eine Absage aus diesem Grund hat spätestens 3 Tage vor dem Termin zu erfolgen).",
    ],
  },
  {
    title: "§2 Behandelnde Personen, Verantwortung & Vertragsverhältnis",
    paragraphs: [
      "Die medizinische Behandlung erfolgt ausschließlich durch selbstständig tätige, approbierte Ärzt:innen oder Zahnärzt:innen. Diese handeln eigenverantwortlich und unterliegen im Rahmen der Kurse der fachlichen Anleitung und Aufsicht durch qualifizierte Dozent:innen.",
      "Das Behandlungsverhältnis sowie die Abrechnung bestehen ausschließlich zwischen der behandelnden Ärzt:in und der Proband:in. Die behandelnde Ärzt:in ist stets diejenige Person, die die konkrete Behandlung durchführt.",
      "Die EPHIA Medical GmbH tritt nicht als Behandlerin auf. Sie ist nicht Partei des Behandlungsvertrags und übernimmt keine medizinische Verantwortung oder Haftung für die Durchführung oder das Ergebnis der Behandlung.",
      "EPHIA handelt ausschließlich im Auftrag der dozierenden bzw. behandelnden Ärzt:innen und übernimmt organisatorische Aufgaben, insbesondere im Zusammenhang mit Terminvergabe, Kursorganisation und Teilnehmermanagement.",
    ],
  },
  {
    title: "§3 Aufklärung und Einwilligung",
    paragraphs: [
      "Vor jeder Behandlung erfolgt eine umfassende medizinische Aufklärung durch die behandelnde Ärzt:in.",
      "Die Durchführung der Behandlung setzt die vorherige schriftliche Einwilligung der Proband:in voraus. Proband:innen haben jederzeit das Recht, Fragen zu stellen sowie eine Behandlung oder Teilnahme ohne Angabe von Gründen abzulehnen.",
    ],
  },
  {
    title: "§4 Behandlungsergebnis, Korrekturen und Reklamationen",
    paragraphs: [
      "Die Behandlungen erfolgen im Rahmen von ärztlichen Fortbildungen zu Ausbildungszwecken. Trotz sorgfältiger Durchführung kann kein bestimmtes ästhetisches Ergebnis garantiert werden.",
      "Abweichungen im Behandlungsergebnis sind möglich und stellen keinen Mangel dar. Ein Anspruch auf ein bestimmtes Ergebnis besteht nicht.",
      "Im Falle von Unzufriedenheit unterstützt EPHIA auf Wunsch die Kommunikation mit der behandelnden Ärzt:in. Die Entscheidung über medizinisch indizierte Korrekturen liegt ausschließlich bei der behandelnden Ärzt:in.",
      "Etwaige Korrekturbehandlungen außerhalb des Kurses werden direkt zwischen der Proband:in und der behandelnden Ärzt:in abgerechnet. Ein genereller Anspruch auf kostenfreie Nachbehandlungen besteht nicht.",
    ],
  },
  {
    title: "§5 Verbindlichkeit der Buchung, Stornierung und No-Show-Gebühr",
    paragraphs: [
      "Die Buchung eines Behandlungstermins ist verbindlich. Aufgrund begrenzter Kapazitäten und des hohen organisatorischen Aufwands ist eine zuverlässige Teilnahme erforderlich.",
      "Eine kostenfreie Stornierung ist bis spätestens 48 Stunden vor dem gebuchten Termin in Textform (z. B. per E-Mail an customerlove@ephia.de oder über das Buchungsportal) möglich.",
      "Bei einer Absage weniger als 48 Stunden vor dem Termin oder bei Nichterscheinen (No-Show) wird eine Ausfallgebühr in Höhe von 50 € erhoben.",
      "Der Proband:in bleibt der Nachweis vorbehalten, dass kein oder ein geringerer Ausfall entstanden ist (z. B. weil der Termin anderweitig vergeben werden konnte). Das Recht zur Kündigung des Behandlungsvertrags aus wichtigem Grund bleibt unberührt.",
      "Mit der Buchung eines Termins und der Zustimmung zu diesen AGB erklärt sich die Proband:in ausdrücklich mit der Erhebung dieser Ausfallgebühr einverstanden.",
      "EPHIA behält sich darüber hinaus vor, Proband:innen bei wiederholtem unzuverlässigem Verhalten vom Proband:innenprogramm auszuschließen.",
    ],
  },
  {
    title: "§6 Terminänderung durch EPHIA",
    paragraphs: [
      "Um einen lückenlosen Behandlungsablauf innerhalb der Kurse sicherzustellen, ist EPHIA berechtigt, gebuchte Zeitfenster auf einen anderen verfügbaren Termin innerhalb desselben Kurstages umzulegen, sofern dies für die Proband:in zumutbar ist, oder die Buchung zu stornieren, falls das gewählte Zeitfenster zu Behandlungslücken im Kursablauf führen würde. Eine Stornierung erfolgt spätestens 3 Tage vor dem Termin.",
      "EPHIA wird die Proband:in in diesen Fällen unverzüglich per E-Mail informieren. Ein Anspruch auf Ersatz von Aufwendungen (z. B. Anreisekosten) besteht nicht.",
    ],
  },
  {
    title: "§7 Vorbereitung auf die Behandlung",
    paragraphs: [
      "Zur Gewährleistung eines sicheren und reibungslosen Ablaufs verpflichten sich Proband:innen, folgende Vorbereitungshinweise einzuhalten:",
      [
        "Kein Konsum von Alkohol oder Drogen innerhalb von 24 Stunden vor dem Termin",
        "Keine Einnahme blutverdünnender Medikamente (z. B. ASS), sofern medizinisch vertretbar",
        "Ungeschminktes Erscheinen bei Gesichtsbehandlungen",
        "Frisch gereinigte Haut ohne unmittelbar zuvor aufgetragene Pflegeprodukte",
        "Pünktliches Erscheinen (empfohlen: mindestens 10 Minuten vor Terminbeginn)",
      ],
      "Bei Nichteinhaltung dieser Hinweise kann die Behandlung abgelehnt werden, sofern eine sichere oder termingerechte Durchführung dadurch unmöglich wird.",
    ],
  },
  {
    title: "§8 Behandlungskosten und Abrechnung",
    paragraphs: [
      "Die auf der Buchungsseite angegebenen Richtpreise dienen ausschließlich der Orientierung und stellen kein verbindliches Angebot dar.",
      "Der genaue Behandlungsumfang und die endgültigen Kosten werden im persönlichen Aufklärungsgespräch mit der behandelnden Ärzt:in vor der Behandlung festgelegt. Die Abrechnung erfolgt nach der Gebührenordnung für Ärzte (GOÄ).",
      "Die Bezahlung der Behandlung erfolgt nach der Behandlung vor Ort. Eine Vorauszahlung findet nicht statt. Die im Rahmen der Buchung hinterlegte Bezahlmethode dient ausschließlich zur Absicherung der Ausfallgebühr gemäß §5 dieser Teilnahmebedingungen.",
    ],
  },
  {
    title: "§9 Gesundheitlicher Zustand und Mitwirkungspflichten",
    paragraphs: [
      "Proband:innen sind verpflichtet, die behandelnde Ärzt:in vor der Behandlung vollständig und wahrheitsgemäß über ihren Gesundheitszustand zu informieren.",
      "Dies umfasst insbesondere:",
      [
        "relevante Vorerkrankungen",
        "Allergien oder Unverträglichkeiten",
        "aktuelle Medikation (insbesondere Antibiotika, Blutverdünner, Immunsuppressiva)",
        "Schwangerschaft oder Stillzeit",
      ],
      "Unvollständige oder fehlerhafte Angaben können zu Risiken führen und berechtigen die behandelnde Ärzt:in, die Behandlung abzulehnen.",
    ],
  },
];

export default function ProbandAGBPage() {
  return (
    <article className="max-w-3xl mx-auto px-5 md:px-8 py-16 md:py-24 text-black">
      <h1 className="text-3xl md:text-4xl font-bold tracking-wide mb-4">
        ALLGEMEINE TEILNAHMEBEDINGUNGEN FÜR PROBAND:INNEN
      </h1>
      <p className="text-base text-black/70 mb-10">
        Diese Bedingungen gelten für jede Buchung eines Behandlungstermins als Proband:in
        in einem EPHIA Kurs. Sie werden im Buchungsprozess ausdrücklich bestätigt.
      </p>

      {SECTIONS.map((section) => (
        <section key={section.title} className="mb-10">
          <h2 className="text-lg md:text-xl font-bold mb-3">{section.title}</h2>
          {section.paragraphs.map((p, i) =>
            Array.isArray(p) ? (
              <ul
                key={i}
                className="list-disc pl-6 text-base leading-relaxed space-y-2 mb-4"
              >
                {p.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            ) : (
              <p key={i} className="text-base leading-relaxed mb-4">
                {p}
              </p>
            ),
          )}
        </section>
      ))}
    </article>
  );
}
