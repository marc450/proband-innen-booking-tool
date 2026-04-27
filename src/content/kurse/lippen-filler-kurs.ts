import type { CourseLandingContent } from "./types";
import { aufbaukursLippen } from "./aufbaukurs-lippen";

/**
 * Lippen-Filler-Kurs — synonym performance landing page.
 *
 * Captures the "Lippen Filler Kurs" search cluster (colloquial query
 * for the Aufbaukurs Lippen). Same pattern as botox-fortbildung and
 * filler-kurs: one synonym-rich page absorbs queries like
 * "Lippen-Filler-Kurs", "Lippenunterspritzung Kurs", "Hyaluron Lippen
 * Kurs", "Lippenkurs für Ärzt:innen", "Lippen-Schulung", "Lippen-
 * Seminar", "Lippenfortbildung" instead of letting the canonical
 * Aufbaukurs Lippen page chase too many intents at once.
 *
 * Re-uses the aufbaukurs_lippen Supabase template (same dates, same
 * Inhalt, same Lernplattform, same Testimonials). Differentiation
 * comes from synonym-rich copy on hero, lernziele intro and FAQ.
 *
 * Important honesty point: this is an Aufbaukurs that requires prior
 * Dermalfiller experience. The hero, FAQ and Lernziele intro flag
 * that explicitly so we don't mismatch beginner-stage searcher intent.
 */
export const lippenFillerKurs: CourseLandingContent = {
  slug: "lippen-filler-kurs",
  courseKey: "aufbaukurs_lippen",

  meta: {
    title:
      "Lippen-Filler-Kurs für Ärzt:innen | Schulung, Seminar & Praxiskurs | EPHIA",
    description:
      "Lippen-Filler-Kurs für approbierte Ärzt:innen mit Grunderfahrung in Dermalfillern: Online-Seminar, Praxis-Schulung und Hybrid-Kurs für sichere Lippenbehandlungen. Anatomie, Indikationen, Technik und Komplikationsmanagement, mit dichten Behandlungsvideos.",
    ogImage: "/kurse/aufbaukurs_lippen/og-image.jpg",
  },

  hero: {
    heading: "LIPPEN-FILLER-KURS\nFÜR ÄRZT:INNEN",
    socialProof: "Über 300 Ärzt:innen wurden bei uns fortgebildet",
    ctaStacked: true,
    subheadline:
      "Online-Seminar, Praxis-Schulung oder Hybridkurs für sichere Lippenbehandlungen. Aufbaukurs für approbierte Ärzt:innen mit Grunderfahrung in der Dermalfiller-Anwendung.",
    stats: aufbaukursLippen.hero.stats,
    description:
      "Wenn Du ein Lippen-Filler-Seminar, eine Lippen-Schulung oder einen vollständigen Lippen-Praxiskurs suchst, bist Du genau richtig: unser Aufbaukurs verbindet flexibles Online-Lernen mit einem Praxistag, an dem Du das Gelernte unter Aufsicht an echten Proband:innen anwendest. Im Online-Modul vertiefst Du Anatomie, Indikationen, Produktwahl und Injektionstechniken speziell für die Lippen, mit dichten Behandlungsvideos. Voraussetzung sind Approbation als Ärzt:in und Grunderfahrung mit Dermalfillern, idealerweise nach absolviertem Grundkurs Dermalfiller.",
    videoPath: aufbaukursLippen.hero.videoPath,
    videoPoster: aufbaukursLippen.hero.videoPoster,
  },

  lernziele: {
    heading: "LERNZIELE",
    intro:
      "Unser Lippen-Filler-Kurs vertieft Deine Behandlungssicherheit an den Lippen, fundiert, praxisnah und diskriminierungssensibel. Im Fokus stehen folgende Lernziele:",
    items: aufbaukursLippen.lernziele.items,
  },

  kursangeboteHeading: "UNSERE FORMATE",

  gruppenbuchungen: {
    heading: "GRUPPENBUCHUNGEN",
    description:
      "Praxisteam, das gemeinsam einen Lippen-Filler-Kurs absolvieren möchte? Gerne erstellen wir maßgeschneiderte Schulungen für Dich und Deine Kolleg:innen. Sende uns dazu einfach eine Anfrage mit folgendem Inhalt: Anzahl Teilnehmer:innen (min. 4 Personen), gewünschter Kursinhalt, gewünschter Zeitraum.",
    ctaLabel: "Jetzt Anfrage senden",
    ctaHref:
      "mailto:customerlove@ephia.de?subject=Gruppenbuchung%20Lippen-Filler-Kurs",
  },

  inhalt: aufbaukursLippen.inhalt,

  lernplattform: aufbaukursLippen.lernplattform,

  ctaBanner: {
    heading: "Bereit für Deinen Lippen-Filler-Kurs?",
    ctaLabel: "Termine sehen",
    ctaHref: "#kursangebote",
  },

  testimonials: {
    heading: "PRAXISSTIMMEN",
    items: aufbaukursLippen.testimonials.items,
  },

  faq: {
    heading: "FAQ",
    items: [
      {
        question:
          "Was ist der Unterschied zwischen Lippen-Filler-Seminar, Lippen-Schulung und Lippen-Praxiskurs?",
        answer:
          "Die Begriffe werden im Sprachgebrauch unterschiedlich genutzt. Bei uns bezeichnet das Lippen-Filler-Seminar typischerweise die theoretischen Online-Inhalte (Anatomie der Lippen, Indikationen, Behandlungsvideos), die Lippen-Schulung die Kombination aus Online-Modul und Praxistag, und der Lippen-Praxiskurs den reinen Hands-on-Teil. Inhaltlich bauen alle drei auf dem gleichen Curriculum auf. Welches Format zu Dir passt, hängt davon ab, ob Du nur die Theorie oder auch die praktische Anwendung trainieren möchtest.",
      },
      {
        question: "Ist der Lippen-Filler-Kurs für Einsteiger:innen geeignet?",
        answer:
          "Nein. Unser Lippen-Filler-Kurs ist ein Aufbaukurs und richtet sich an approbierte Ärzt:innen, die bereits Grunderfahrung in der Dermalfiller-Anwendung haben. Du solltest die Anatomie des Gesichts, die wichtigsten Injektionstechniken und die Grundlagen des Komplikationsmanagements bereits beherrschen, idealerweise nach absolviertem Grundkurs Dermalfiller. Wenn Du noch keine Erfahrung mit Dermalfillern hast, beginne mit unserem Grundkurs Dermalfiller.",
      },
      {
        question: "Wird im Praxisteil mit Hyaluron behandelt?",
        answer:
          "Ja. Im Praxisteil arbeitest Du mit Hyaluronsäure-basierten Dermalfillern, also genau den Präparaten, die für Lippenbehandlungen üblich sind. Geübt wird nicht mit NaCl oder Wasserspritzen, sondern mit echten Filler-Produkten unter Aufsicht erfahrener Dozent:innen. So gewinnst Du ein realistisches Gefühl für Viskosität, Eindringtiefe und Gewebeantwort an den Lippen.",
      },
      {
        question: "Welche Behandlungstechniken lerne ich im Lippen-Filler-Kurs?",
        answer:
          "Wir vertiefen die für die Lippen relevanten Techniken: lineare Retrograde, Mikrobolus, Tenting sowie die Auswahl zwischen Kanüle und Nadel. Zu jeder Technik gibt es ausführliche Behandlungsvideos und Schritt-für-Schritt-Anzeichnungen, damit Du den Ablauf sicher nachvollziehen und in Deinen Praxisalltag übertragen kannst.",
      },
      {
        question: "Bietet die Lippen-Schulung CME-Punkte?",
        answer:
          "Die CME-Punkte für unseren Lippen-Filler-Kurs sind aktuell bei der LÄK Berlin beantragt. Sobald die Akkreditierung abgeschlossen ist, werden die Punkte allen Teilnehmer:innen rückwirkend gutgeschrieben. Das EPHIA-Zertifikat erhältst Du unabhängig davon direkt nach Abschluss des Kurses.",
      },
      {
        question:
          "Muss ich approbierte Ärzt:in sein, um am Lippen-Filler-Kurs teilzunehmen?",
        answer:
          "Ja. Unser Lippen-Filler-Kurs richtet sich ausschließlich an approbierte Ärzt:innen. Diese Voraussetzung ist sowohl rechtlich als auch fachlich notwendig, da die Anwendung von Dermalfillern an den Lippen fundiertes anatomisches Verständnis und sicheres Komplikationsmanagement voraussetzt.",
      },
      ...aufbaukursLippen.faq.items.filter(
        (item) =>
          !item.question.startsWith("Sind die CME") &&
          !item.question.startsWith("Muss ich den Grundkurs"),
      ),
    ],
  },

  breadcrumbLabel: "Lippen-Filler-Kurs für Ärzt:innen",
};
