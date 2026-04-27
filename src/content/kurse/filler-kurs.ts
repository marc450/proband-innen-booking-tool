import type { CourseLandingContent } from "./types";
import { grundkursDermalfiller } from "./grundkurs-dermalfiller";

/**
 * Filler-Kurs — synonym performance landing page.
 *
 * Captures the broad "Filler-Kurs" search cluster (more colloquial than
 * "Grundkurs Dermalfiller"; higher implied volume). Same pattern as
 * botox-fortbildung: one page absorbs multiple synonym queries instead
 * of multiple thin pages cannibalising each other.
 *
 * Targets: "Filler-Kurs", "Filler-Schulung", "Filler-Seminar",
 * "Filler-Fortbildung", "Filler-Praxiskurs", "Hyaluron-Kurs",
 * "Dermalfiller-Kurs für Ärzt:innen". The hero, FAQ and a dedicated
 * comparison Q&A weave the synonyms naturally so a single canonical
 * ranks for all of them.
 *
 * Re-uses the grundkurs_dermalfiller Supabase template (same dates,
 * same Inhalt, same Lernplattform, same Testimonials) and inherits
 * Lernziele items verbatim. Differentiation comes from synonym-rich
 * copy on hero, lernziele intro and FAQ.
 */
export const fillerKurs: CourseLandingContent = {
  slug: "filler-kurs",
  courseKey: "grundkurs_dermalfiller",

  meta: {
    title: "Filler-Kurs für Ärzt:innen | Seminar, Schulung & Praxiskurs | EPHIA",
    description:
      "Filler-Kurs für approbierte Ärzt:innen: Online-Seminar, Praxis-Schulung oder Hybrid-Kurs zur sicheren Anwendung von Dermalfillern. CME-akkreditiert, mit Behandlungsvideos und Praxistag an echten Proband:innen.",
    ogImage: "/kurse/grundkurs_dermalfiller/og-image.jpg",
  },

  hero: {
    heading: "FILLER-KURS\nFÜR ÄRZT:INNEN",
    socialProof: "Über 300 Ärzt:innen wurden bei uns fortgebildet",
    ctaStacked: true,
    subheadline:
      "Online-Seminar, Praxis-Schulung oder Hybridkurs. CME-akkreditierte Filler-Fortbildung für approbierte Ärzt:innen.",
    stats: grundkursDermalfiller.hero.stats,
    description:
      "Egal ob Du ein Filler-Seminar, eine Filler-Schulung oder einen vollständigen Filler-Praxiskurs suchst: unsere Fortbildung verbindet flexibles Online-Lernen mit einem Praxistag an echten Proband:innen. Im Online-Modul lernst Du Anatomie, Indikationen, Injektionstechniken und Komplikationsmanagement, mit dichten Behandlungsvideos zu jeder Zone. Am Praxistag behandelst Du unter Aufsicht. Voraussetzung ist Deine Approbation als Ärzt:in.",
    videoPath: grundkursDermalfiller.hero.videoPath,
    videoPoster: grundkursDermalfiller.hero.videoPoster,
    videoObjectPosition: grundkursDermalfiller.hero.videoObjectPosition,
  },

  lernziele: {
    heading: "LERNZIELE",
    intro:
      "Unser Filler-Kurs führt Dich strukturiert vom theoretischen Online-Seminar bis zur sicheren ersten Behandlung mit Dermalfillern. Im Fokus stehen folgende Lernziele:",
    items: grundkursDermalfiller.lernziele.items,
  },

  kursangeboteHeading: "UNSERE FORMATE",

  gruppenbuchungen: {
    heading: "GRUPPENBUCHUNGEN",
    description:
      "Praxisteam, das gemeinsam in einen Filler-Kurs einsteigen möchte? Gerne erstellen wir maßgeschneiderte Schulungen für Dich und Deine Kolleg:innen. Sende uns dazu einfach eine Anfrage mit folgendem Inhalt: Anzahl Teilnehmer:innen (min. 4 Personen), gewünschter Kursinhalt, gewünschter Zeitraum.",
    ctaLabel: "Jetzt Anfrage senden",
    ctaHref:
      "mailto:customerlove@ephia.de?subject=Gruppenbuchung%20Filler-Kurs",
  },

  inhalt: grundkursDermalfiller.inhalt,

  lernplattform: grundkursDermalfiller.lernplattform,

  ctaBanner: {
    heading: "Bereit für Deinen Filler-Kurs?",
    ctaLabel: "Termine sehen",
    ctaHref: "#kursangebote",
  },

  testimonials: {
    heading: "PRAXISSTIMMEN",
    items: grundkursDermalfiller.testimonials.items,
  },

  faq: {
    heading: "FAQ",
    items: [
      {
        question:
          "Was ist der Unterschied zwischen Filler-Seminar, Filler-Schulung und Filler-Praxiskurs?",
        answer:
          "Die Begriffe werden im Sprachgebrauch unterschiedlich genutzt. Bei uns bezeichnet das Filler-Seminar typischerweise die theoretischen Online-Inhalte (Anatomie, Indikationen, Behandlungsvideos), die Filler-Schulung die Kombination aus Online-Modul und Praxistag, und der Filler-Praxiskurs den reinen Hands-on-Teil. Inhaltlich bauen alle drei auf dem gleichen Curriculum auf. Welches Format zu Dir passt, hängt davon ab, ob Du nur die Theorie oder auch die praktische Anwendung trainieren möchtest.",
      },
      {
        question: "Welcher Filler-Kurs passt zu mir als Einsteiger:in?",
        answer:
          "Wenn Du in die ästhetische Filler-Anwendung einsteigst, empfehlen wir Dir den kombinierten Online und Praxiskurs (oft als 'Filler-Schulung' beworben). Du baust zuerst Theorie auf, behandelst dann am Praxistag echte Proband:innen unter Aufsicht und gehst mit 18 CME-Punkten und EPHIA-Zertifikat nach Hause. Wenn Du zunächst nur die Theorie auffrischen möchtest, ist der reine Onlinekurs (Filler-Seminar) der passende Einstieg.",
      },
      {
        question: "Bietet die Filler-Schulung CME-Punkte?",
        answer:
          "Ja. Unsere Filler-Schulung ist von der Ärztekammer Berlin mit insgesamt 18 CME-Punkten akkreditiert. Du erhältst zusätzlich ein EPHIA-Zertifikat über die erfolgreiche Teilnahme. Auch das reine Filler-Seminar (Onlinekurs) ist eigenständig CME-akkreditiert.",
      },
      {
        question: "Wie ist das Format des Filler-Kurses aufgebaut?",
        answer:
          "Der Filler-Kurs kombiniert ein selbstgesteuertes Online-Seminar (ca. 10 Stunden Inhalt mit Behandlungsvideos zu jeder Zone) mit einem 6-stündigen Praxistag in Berlin-Mitte. Im Praxisteil behandelst Du in kleinen Gruppen mit max. 7 Teilnehmer:innen echte Proband:innen unter Aufsicht erfahrener Dozent:innen.",
      },
      {
        question: "Wird im Filler-Praxiskurs mit Hyaluron behandelt?",
        answer:
          "Ja. Im Praxisteil arbeitest Du mit Hyaluronsäure-basierten Dermalfillern, also genau den Präparaten, die Du auch im späteren Praxisalltag verwendest. Geübt wird nicht mit NaCl oder Wasserspritzen, sondern mit echten Filler-Produkten unter Aufsicht erfahrener Dozent:innen. So gewinnst Du ein realistisches Gefühl für Viskosität, Eindringtiefe und Gewebeantwort.",
      },
      {
        question:
          "Muss ich approbierte Ärzt:in sein, um am Filler-Kurs teilzunehmen?",
        answer:
          "Ja. Unser Filler-Kurs richtet sich ausschließlich an approbierte Ärzt:innen. Diese Voraussetzung ist sowohl rechtlich als auch fachlich notwendig, da die Anwendung von Dermalfillern medizinisches Grundwissen, anatomisches Verständnis und sicheres Komplikationsmanagement voraussetzt.",
      },
      ...grundkursDermalfiller.faq.items.filter(
        (item) => !item.question.startsWith("Muss ich approbierte"),
      ),
    ],
  },

  breadcrumbLabel: "Filler-Kurs für Ärzt:innen",
  relatedCourses: [
    "lippen-filler-kurs",
    "grundkurs-dermalfiller",
    "aufbaukurs-lippen",
  ],
};
