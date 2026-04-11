import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Allgemeine Geschäftsbedingungen — EPHIA",
  description:
    "Allgemeine Geschäftsbedingungen (AGB) der EPHIA Medical GmbH i.G. für digitale und praktische Fortbildungsangebote.",
  alternates: { canonical: "https://www.ephia.de/terms" },
};

type Section = {
  title: string;
  paragraphs: (string | string[])[];
};

const SECTIONS: Section[] = [
  {
    title: "1. Allgemeines",
    paragraphs: [
      "Diese Allgemeinen Geschäftsbedingungen (AGB) regeln das Vertragsverhältnis zwischen der EPHIA Medical GmbH i.G., Dorfstraße 30, 15913 Märkische Heide, Deutschland (im Folgenden „EPHIA\", „wir\", „uns\") und den jeweiligen Kund:innen unserer digitalen und praktischen Fortbildungsangebote im Bereich der minimalinvasiven ästhetischen Medizin. Die EPHIA Medical GmbH i.G. befindet sich seit dem 21.05.2025 in Gründung.",
    ],
  },
  {
    title: "2. Leistungen & Nutzung der Plattform",
    paragraphs: [
      "EPHIA bietet eine Kombination aus Online- und Praxis-Fortbildungen (Kombikurse), reine Online-Kurse sowie reine Praxisformate an. Die theoretischen Module werden über unsere digitale Lernplattform bereitgestellt. Die Nutzung dieser Inhalte ist personalisiert und darf ausschließlich durch die buchende Person erfolgen.",
    ],
  },
  {
    title: "3. Teilnahmevoraussetzungen",
    paragraphs: [
      "Die Teilnahme ist ausschließlich approbierten Ärzt:innen oder Zahnmediziner:innen vorbehalten. Mit der Kursbuchung bestätigst Du, dass Du über eine gültige Approbation verfügst. EPHIA behält sich das Recht vor, entsprechende Nachweise vor Kursbeginn einzufordern und bei Nichtvorlage den Zugang zu verweigern.",
    ],
  },
  {
    title: "4. Urheberrecht & Nutzungsrechte",
    paragraphs: [
      "Alle digitalen Inhalte, Unterlagen, Videos, Texte, Bilder und sonstige Materialien sind urheberrechtlich geschützt und dürfen ohne unsere ausdrückliche schriftliche Genehmigung weder vervielfältigt, veröffentlicht, bearbeitet noch an Dritte weitergegeben werden.",
    ],
  },
  {
    title: "5. Preise & Zahlung",
    paragraphs: [
      "Die jeweils gültigen Preise sind auf unserer Website oder im Kursangebot einsehbar. Maßgeblich ist der Preis zum Zeitpunkt der Buchung.",
    ],
  },
  {
    title: "6. Rücktritt, Umbuchung & Stornierung",
    paragraphs: [
      "Du kannst Deine Buchung bis spätestens 14 Tage vor Kursbeginn kostenfrei stornieren. Nach diesem Zeitpunkt ist eine Rückerstattung der Kursgebühr nicht mehr möglich. Eine Umbuchung des Praxiskurses auf ein anderes Datum ist einmalig möglich bis 7 Tage vor dem Kursdatum. Für die Umbuchung fällt eine Bearbeitungsgebühr von maximal 10 % des Kurswertes an.",
      "EPHIA behält sich das Recht vor, Kurse bis spätestens 5 Werktage vor Beginn abzusagen, z. B. bei zu geringer Teilnehmerzahl oder krankheitsbedingtem Ausfall der Dozent:innen. Bereits geleistete Zahlungen werden in diesem Fall vollständig rückerstattet.",
    ],
  },
  {
    title: "7. Durchführung & Haftung",
    paragraphs: [
      "Unsere Inhalte werden mit größtmöglicher Sorgfalt von erfahrenen Fachpersonen erstellt. Dennoch übernehmen wir keine Gewähr für die Aktualität, Vollständigkeit oder Richtigkeit der vermittelten Informationen. Die praktische Umsetzung des Gelernten liegt in Deiner Eigenverantwortung.",
    ],
  },
  {
    title: "8. Impf- und Versicherungspflicht",
    paragraphs: [
      "Mit Annahme dieser AGB bestätigst Du, dass Du",
      [
        "vollständig gegen Hepatitis B geimpft bist,",
        "eine Berufshaftpflichtversicherung abgeschlossen hast, die ästhetische Indikationen (z. B. Botulinum- und Dermalfillerbehandlungen) abdeckt.",
      ],
    ],
  },
  {
    title: "9. Datenschutz",
    paragraphs: [
      "Der Schutz Deiner Daten ist uns wichtig. Alle Informationen zur Erhebung, Speicherung und Verarbeitung personenbezogener Daten findest Du in unserer Datenschutzerklärung. Mit Vertragsabschluss stimmst Du der dort beschriebenen Datenverarbeitung zu.",
    ],
  },
  {
    title: "10. Erfüllungsort, Gerichtsstand & anwendbares Recht",
    paragraphs: [
      "Erfüllungsort für alle Leistungen ist Berlin, Deutschland. Für alle Streitigkeiten gilt ausschließlich deutsches Recht unter Ausschluss internationaler Kollisionsnormen. Gerichtsstand ist Berlin, sofern gesetzlich zulässig.",
    ],
  },
  {
    title: "11. Salvatorische Klausel",
    paragraphs: [
      "Sollten einzelne Bestimmungen dieser AGB ganz oder teilweise unwirksam sein oder werden, bleibt die Gültigkeit der übrigen Bestimmungen unberührt. Die unwirksame Regelung gilt durch eine solche ersetzt, die dem wirtschaftlichen Zweck der ursprünglichen Bestimmung am nächsten kommt.",
    ],
  },
];

export default function AGBPage() {
  return (
    <article className="max-w-3xl mx-auto px-5 md:px-8 py-16 md:py-24 text-black">
      <h1 className="text-3xl md:text-4xl font-bold tracking-wide mb-10">
        ALLGEMEINE GESCHÄFTSBEDINGUNGEN
      </h1>

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
            )
          )}
        </section>
      ))}
    </article>
  );
}
