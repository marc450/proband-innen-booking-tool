import type { CourseLandingContent } from "./types";
import { grundkursBotulinum } from "./grundkurs-botulinum";

/**
 * Botox-Fortbildung — consolidated synonym performance landing page.
 *
 * Replaces three near-duplicate pages from the old LearnWorlds site
 * (`www.ephia.de/botox-seminar`, `www.ephia.de/botox-schulung`, plus
 * the implicit "Botox-Fortbildung" intent). One page absorbs all three
 * search synonyms instead of three thin pages cannibalising each other.
 *
 * Targets: "Botox-Schulung", "Botox-Seminar", "Botox-Fortbildung",
 * "Botox-Kurs für Ärzt:innen", "Botulinum-Fortbildung". The hero, FAQ
 * and a dedicated comparison Q&A weave the synonyms naturally so a
 * single canonical ranks for all of them.
 *
 * Re-uses the grundkurs_botulinum Supabase template (same dates, same
 * Inhalt) and inherits Lernziele items + Lernplattform + Inhalt
 * verbatim. Differentiation comes from the synonym-rich copy on hero,
 * lernziele intro and FAQ.
 *
 * NOTE: Performance landing page, "Botox" wording is permitted per CI.
 */
export const botoxFortbildung: CourseLandingContent = {
  slug: "botox-fortbildung",
  courseKey: "grundkurs_botulinum",

  meta: {
    title: "Botox-Fortbildung, Seminar & Schulung für Ärzt:innen | EPHIA",
    description:
      "Botox-Fortbildung für approbierte Ärzt:innen: Online-Seminar, Praxis-Schulung oder Hybrid-Kurs. CME-akkreditiert, mit Behandlungsvideos und Praxistag an echten Proband:innen.",
    ogImage: "/kurse/grundkurs_botulinum/og-image.jpg",
  },

  hero: {
    heading: "BOTOX-FORTBILDUNG\nFÜR ÄRZT:INNEN",
    socialProof: "Über 300 Ärzt:innen wurden bei uns fortgebildet",
    ctaStacked: true,
    subheadline:
      "Online-Seminar, Praxis-Schulung oder Hybridkurs. CME-akkreditierte Botulinum-Fortbildung für approbierte Ärzt:innen.",
    stats: [
      { icon: "Clock", label: "Format", value: "10h Online + 6h Präsenz" },
      { icon: "Award", label: "Akkreditiert", value: "22 CME-Punkte + Zertifikat" },
      { icon: "GraduationCap", label: "Level", value: "Einsteigerkurs" },
    ],
    description:
      "Egal ob Du eine Botox-Schulung, ein Botox-Seminar oder einen vollständigen Botox-Kurs suchst: unsere Fortbildung vereint flexibles Online-Lernen mit einem Praxistag an echten Proband:innen. Im Online-Modul lernst Du Anatomie, Indikationen, Injektionstechnik und Komplikationsmanagement, mit dichten Behandlungsvideos zu jeder Zone. Am Praxistag behandelst Du unter Aufsicht. Voraussetzung ist Deine Approbation als Ärzt:in.",
    videoPath: grundkursBotulinum.hero.videoPath,
    videoPoster: grundkursBotulinum.hero.videoPoster,
  },

  lernziele: {
    heading: "LERNZIELE",
    intro:
      "Unsere Botox-Fortbildung führt Dich strukturiert vom theoretischen Online-Seminar bis zur sicheren ersten Behandlung. Im Fokus stehen folgende Lernziele:",
    items: grundkursBotulinum.lernziele.items,
  },

  kursangeboteHeading: "UNSERE FORMATE",

  gruppenbuchungen: {
    heading: "GRUPPENBUCHUNGEN",
    description:
      "Praxisteam, das gemeinsam in eine Botox-Fortbildung einsteigen möchte? Gerne erstellen wir maßgeschneiderte Schulungen für Dich und Deine Kolleg:innen. Sende uns dazu einfach eine Anfrage mit folgendem Inhalt: Anzahl Teilnehmer:innen (min. 4 Personen), gewünschter Kursinhalt, gewünschter Zeitraum.",
    ctaLabel: "Jetzt Anfrage senden",
    ctaHref: "mailto:customerlove@ephia.de?subject=Gruppenbuchung%20Botox-Fortbildung",
  },

  inhalt: grundkursBotulinum.inhalt,

  lernplattform: grundkursBotulinum.lernplattform,

  ctaBanner: {
    heading: "Bereit für Deine Botox-Fortbildung?",
    ctaLabel: "Termine sehen",
    ctaHref: "#kursangebote",
  },

  testimonials: {
    heading: "PRAXISSTIMMEN",
    items: grundkursBotulinum.testimonials.items,
  },

  faq: {
    heading: "FAQ",
    items: [
      {
        question:
          "Was ist der Unterschied zwischen Botox-Seminar, Botox-Schulung und Botox-Praxiskurs?",
        answer:
          "Die Begriffe werden im Sprachgebrauch unterschiedlich genutzt. Bei uns bezeichnet das Botox-Seminar typischerweise die theoretischen Online-Inhalte (Anatomie, Indikationen, Behandlungsvideos), die Botox-Schulung die Kombination aus Online-Modul und Praxistag, und der Botox-Praxiskurs den reinen Hands-on-Teil. Inhaltlich bauen alle drei auf dem gleichen Curriculum auf. Welches Format zu Dir passt, hängt davon ab, ob Du nur die Theorie oder auch die praktische Anwendung trainieren möchtest.",
      },
      {
        question: "Welche Botox-Fortbildung passt zu mir als Einsteiger:in?",
        answer:
          "Wenn Du in die ästhetische Botulinum-Anwendung einsteigst, empfehlen wir Dir den kombinierten Online- & Praxiskurs (oft als 'Botox-Schulung' beworben). Du baust zuerst Theorie auf, behandelst dann am Praxistag echte Proband:innen unter Aufsicht und gehst mit 22 CME-Punkten und EPHIA-Zertifikat nach Hause. Wenn Du zunächst nur die Theorie auffrischen möchtest, ist der reine Onlinekurs (Botox-Seminar) der passende Einstieg.",
      },
      {
        question: "Bietet die Botox-Schulung CME-Punkte?",
        answer:
          "Ja. Unsere Botox-Schulung ist von der Ärztekammer Berlin mit insgesamt 22 CME-Punkten akkreditiert (10 Punkte Onlinekurs plus 12 Punkte Praxistag). Du erhältst zusätzlich ein EPHIA-Zertifikat über die erfolgreiche Teilnahme. Auch das reine Botox-Seminar (Onlinekurs) ist eigenständig CME-akkreditiert.",
      },
      {
        question: "Wie ist das Format der Botox-Fortbildung aufgebaut?",
        answer:
          "Die Botox-Fortbildung kombiniert ein selbstgesteuertes Online-Seminar (ca. 10 Stunden Inhalt mit Behandlungsvideos zu jeder Zone) mit einem 6-stündigen Praxistag in Berlin-Mitte. Im Praxisteil behandelst Du in kleinen Gruppen mit max. 7 Teilnehmer:innen echte Proband:innen unter Aufsicht erfahrener Dozent:innen. Geübt wird mit Botulinum, nicht mit NaCl.",
      },
      {
        question:
          "Muss ich approbierte Ärzt:in sein, um an der Botox-Fortbildung teilzunehmen?",
        answer:
          "Ja. Unsere Botox-Fortbildung richtet sich ausschließlich an approbierte Ärzt:innen und Zahnärzt:innen. Diese Voraussetzung ist sowohl rechtlich als auch fachlich notwendig, da Botulinum in Deutschland verschreibungspflichtig ist und die sichere Anwendung medizinisches Grundwissen voraussetzt.",
      },
      ...grundkursBotulinum.faq.items.filter(
        (item) =>
          !item.question.startsWith("Muss ich approbierte"),
      ),
    ],
  },

  breadcrumbLabel: "Botox-Fortbildung für Ärzt:innen",
};
