import type { CourseLandingContent } from "./types";
import { grundkursBotulinum } from "./grundkurs-botulinum";

/**
 * Botox-Kurs für Anfänger:innen — SEO-targeted persona landing page.
 *
 * Targets the search term "Botox-Kurs für Anfänger" and variants
 * ("Botox lernen Einsteiger", "Botulinum Schulung Einstieg",
 * "ästhetische Medizin Einstieg"). Re-uses the Grundkurs Botulinum
 * Supabase template (same dates, same Inhalt) but ships ~30-40%
 * beginner-framed copy on top so Google doesn't filter it as a
 * near-duplicate of /kurse/grundkurs-botulinum.
 *
 * Beginner-specific differentiation:
 *   - Hero, description, lernziele intro: Einsteiger-flavoured
 *   - LearningPath: 3-step roadmap + "Was Du mitbringst" /
 *     "Was wir nicht voraussetzen" prerequisites block
 *   - FAQ: prepended with 5 beginner-specific Q&A
 *
 * Inhalt / Lernplattform / Testimonials are inherited verbatim because
 * the course IS the same physical course; differentiation comes from
 * the unique copy above.
 */
export const botoxKursFuerAnfaenger: CourseLandingContent = {
  slug: "botox-kurs-fuer-anfaenger",
  // Same Supabase template as Grundkurs Botulinum — booking widget
  // pulls real sessions automatically.
  courseKey: "grundkurs_botulinum",

  meta: {
    title: "Botox-Kurs für Anfänger:innen, Online, Präsenz & Hybrid | EPHIA",
    description:
      "Botox-Kurs für approbierte Ärzt:innen ohne Vorerfahrung in ästhetischer Medizin. Strukturierter Einstieg mit Online-Modul, Praxistag an echten Proband:innen und Community-Support. 22 CME-Punkte und EPHIA-Zertifikat.",
    ogImage: "/kurse/grundkurs_botulinum/og-image.jpg",
  },

  hero: {
    heading: "BOTOX-KURS FÜR\nEINSTEIGER:INNEN",
    socialProof: "Über 300 Ärzt:innen haben bei uns ihren Einstieg gemacht",
    ctaStacked: true,
    subheadline:
      "Strukturierter Einstieg in die ästhetische Medizin für approbierte Ärzt:innen ohne Vorerfahrung.",
    stats: [
      { icon: "Clock", label: "Format", value: "10h Online + 6h Präsenz" },
      { icon: "Award", label: "Akkreditiert", value: "22 CME-Punkte + Zertifikat" },
      { icon: "GraduationCap", label: "Level", value: "Einsteigerkurs" },
    ],
    description:
      "Unser Botox-Kurs für Einsteiger:innen ist Dein strukturierter Weg in die ästhetische Medizin. Auch wenn Du noch nie eine Botulinum-Behandlung gemacht hast, gehst Du nach Online-Modul und Praxistag mit Sicherheit in Anatomie, Indikationen und Injektionstechnik in Deine ersten eigenen Behandlungen. Voraussetzung ist ausschließlich Deine Approbation. Vorerfahrung in ästhetischer Medizin brauchst Du nicht.",
    videoPath: grundkursBotulinum.hero.videoPath,
    videoPoster: grundkursBotulinum.hero.videoPoster,
  },

  lernziele: {
    heading: "LERNZIELE",
    intro:
      "Nach unserem Botox-Kurs für Anfänger:innen kannst Du Deine ersten Patient:innen sicher, fundiert und diskriminierungssensibel mit Botulinum behandeln, auch wenn Du bisher noch keine ästhetische Medizin praktiziert hast. Im Fokus stehen folgende Lernziele:",
    items: grundkursBotulinum.lernziele.items,
  },

  kursangeboteHeading: "UNSERE KURSANGEBOTE",

  gruppenbuchungen: {
    heading: "GRUPPENBUCHUNGEN",
    description:
      "Praxisteam, das gemeinsam in die ästhetische Medizin einsteigen möchte? Gerne erstellen wir maßgeschneiderte Angebote für Dich und Deine Kolleg:innen. Sende uns dazu einfach eine Anfrage mit folgendem Inhalt: Anzahl Teilnehmer:innen (min. 4 Personen), gewünschter Kursinhalt, gewünschter Zeitraum.",
    ctaLabel: "Jetzt Anfrage senden",
    ctaHref:
      "mailto:customerlove@ephia.de?subject=Gruppenbuchung%20Botox-Kurs%20f%C3%BCr%20Anf%C3%A4nger:innen",
  },

  inhalt: grundkursBotulinum.inhalt,

  learningPath: {
    heading: "DEIN LERNWEG",
    intro:
      "Vom ersten Onlinekurs bis zur ersten eigenen Patient:in: in drei klar strukturierten Schritten zum sicheren Einstieg in die Botulinum-Behandlung.",
    steps: [
      {
        number: 1,
        icon: "BookOpen",
        format: "Onlinekurs · 10h",
        title: "Theorie in Deinem Tempo",
        description:
          "Anatomie, Produktkunde, Indikationen und Behandlungsvideos zu jeder Zone. Du lernst flexibel von zu Hause aus, bevor Du das erste Mal injizierst. CME-akkreditierter Test am Ende jedes Kapitels.",
      },
      {
        number: 2,
        icon: "Users",
        format: "Praxistag · 6h",
        title: "Praxistag an Proband:innen",
        description:
          "Du behandelst unter Aufsicht echte Proband:innen in kleinen Gruppen mit max. 7 Teilnehmer:innen. Geübt wird mit Botulinum, nicht mit NaCl. Direktes Feedback von erfahrenen Dozent:innen.",
      },
      {
        number: 3,
        icon: "MessageCircleHeart",
        format: "Community · ab Tag 1",
        title: "Sicher starten in Deiner Praxis",
        description:
          "Nach dem Kurs bleibst Du Teil unserer Ärzt:innen-Community. Du kannst Fälle besprechen, Fragen stellen und bekommst Rückendeckung von Dozent:innen, wenn es zählt.",
      },
    ],
  },

  lernplattform: grundkursBotulinum.lernplattform,

  ctaBanner: {
    heading: "Bereit für Deinen Einstieg in die ästhetische Medizin?",
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
          "Brauche ich Vorerfahrung in ästhetischer Medizin, um an unserem Botox-Kurs für Anfänger:innen teilzunehmen?",
        answer:
          "Nein. Unser Botox-Kurs für Anfänger:innen ist genau für approbierte Ärzt:innen konzipiert, die bisher noch keine ästhetische Medizin praktiziert haben. Voraussetzung ist ausschließlich Deine Approbation. Vorkenntnisse in Botulinum-Behandlungen, Filler oder ästhetischer Medizin sind nicht notwendig. Wir starten mit Anatomie und Grundlagen und führen Dich Schritt für Schritt zur ersten eigenen Behandlung.",
      },
      {
        question: "Reicht der Onlinekurs allein aus, um Patient:innen zu behandeln?",
        answer:
          "Der Onlinekurs vermittelt Dir die theoretischen Grundlagen, Anatomie, Produktwahl, Indikationen und Komplikationsmanagement, und ist auch CME-akkreditiert. Für die ersten eigenen Behandlungen empfehlen wir Dir den Online- & Praxiskurs oder das Komplettpaket. Erst unter Aufsicht an echten Proband:innen entwickelst Du die nötige Behandlungssicherheit, bevor Du allein in Deiner Praxis stehst.",
      },
      {
        question:
          "Wie schnell kann ich nach dem Botox-Kurs für Anfänger:innen erste Patient:innen behandeln?",
        answer:
          "Die meisten Teilnehmer:innen führen ihre erste eigene Patient:innen-Behandlung innerhalb der ersten Wochen nach dem Praxistag durch. Wir empfehlen Dir, mit konservativen Dosierungen zu starten, in der Community Fragen zu stellen und im Zweifel Rücksprache mit unseren Dozent:innen zu halten. Behandlungssicherheit wächst mit Erfahrung. Der Praxistag ist der Anfang dieser Lernkurve, nicht das Ende.",
      },
      {
        question:
          "Was ist der Unterschied zwischen Onlinekurs, Online- & Praxiskurs und Komplettpaket?",
        answer:
          "Der Onlinekurs deckt die komplette Theorie ab, inklusive Behandlungsvideos und CME-Test, ohne praktische Übungen. Der Online- & Praxiskurs ergänzt den Onlinekurs um einen vollen Praxistag, an dem Du echte Proband:innen unter Aufsicht behandelst. Das Komplettpaket enthält zusätzlich den Onlinekurs Medizinische Hautpflege, sodass Du Dein Beratungsspektrum direkt erweitern kannst. Für den vollständigen Einstieg empfehlen wir Online- & Praxiskurs oder Komplettpaket.",
      },
      {
        question:
          "Wie unterstützt Ihr mich nach dem Botox-Kurs für Anfänger:innen?",
        answer:
          "Mit jedem Kurs bekommst Du Zugang zu unserer Ärzt:innen-Community. Dort kannst Du Fälle besprechen, Fragen stellen und unklare Situationen mit Kolleg:innen und unseren Dozent:innen klären. Außerdem bauen unsere Aufbaukurse direkt auf dem Grundkurs auf, etwa Aufbaukurs Lippen, Aufbaukurs Therapeutische Indikationen Botulinum und die Masterclass Botulinum. So kannst Du Dein Fachwissen schrittweise vertiefen.",
      },
      ...grundkursBotulinum.faq.items,
    ],
  },

  breadcrumbLabel: "Botox-Kurs für Anfänger:innen",
  relatedCourses: [
    "botox-kurs-fuer-aerzte",
    "botox-kurs-fuer-zahnaerzte",
    "botox-kurs-fuer-fortgeschrittene",
  ],
};
