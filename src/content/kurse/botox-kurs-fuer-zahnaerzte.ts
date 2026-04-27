import type { CourseLandingContent } from "./types";
import { grundkursBotulinumZahnmedizin } from "./grundkurs-botulinum-zahnmedizin";

/**
 * Botox-Kurs für Zahnärzt:innen — SEO-targeted persona landing page.
 *
 * Targets the search term "Botox-Kurs Zahnärzte" and variants ("Botox
 * Kurs Zahnarzt", "Botox lernen Zahnarzt", "Bruxismus Botox Kurs",
 * "Botulinum Schulung Zahnmedizin").
 *
 * Re-uses the Grundkurs Botulinum Zahnmedizin Supabase template
 * (`grundkurs_botulinum_zahnmedizin`) so dental sessions, dental
 * Inhalt (incl. Bruxismus + Migräne chapters) and the curriculum
 * banner come along automatically. ~30-40% unique copy on top:
 *   - Hero, lernziele intro: dental-scope framing
 *   - LearningPath: 3 dental-flavoured steps, only prereq is
 *     Approbation als Zahnärzt:in
 *   - FAQ: prepended with 4 dental-scope Q&A (legal scope, billing,
 *     Zusatzqualifikation, course difference vs Humanmedizin)
 *
 * NOTE: This is a performance landing page, so "Botox" usage is
 * permitted per CI. Main pages (e.g. /kurse/grundkurs-botulinum-
 * zahnmedizin) must NOT use "Botox" — only "Botulinum".
 */
export const botoxKursFuerZahnaerzte: CourseLandingContent = {
  slug: "botox-kurs-fuer-zahnaerzte",
  // Same Supabase template as the dental Grundkurs — booking widget
  // pulls real dental sessions automatically and shows dental Inhalt
  // (Bruxismus, Migräne).
  courseKey: "grundkurs_botulinum_zahnmedizin",

  meta: {
    title: "Botox-Kurs für Zahnärzt:innen, Bruxismus & Migräne | EPHIA",
    description:
      "Botox-Kurs für approbierte Zahnärzt:innen: Bruxismus, Migräne, Glabella, Stirn und periorale Indikationen. Online-Modul plus Praxistag an echten Proband:innen, kleine Gruppen, EPHIA-Zertifikat.",
    ogImage: "/kurse/grundkurs_botulinum_zahnmedizin/og-image.jpg",
  },

  hero: {
    heading: "BOTOX-KURS FÜR\nZAHNÄRZT:INNEN",
    socialProof: "Praxisnaher Einstieg, fokussiert auf zahnärztliche Indikationen",
    ctaStacked: true,
    subheadline:
      "Praxisnahe Botox-Fortbildung für approbierte Zahnärzt:innen, mit Fokus auf Bruxismus, Migräne und periorale Ästhetik.",
    stats: [
      { icon: "Clock", label: "Format", value: "10h Online + 6h Präsenz" },
      { icon: "Award", label: "Zertifiziert", value: "EPHIA-Zertifikat" },
      { icon: "GraduationCap", label: "Level", value: "Einsteigerkurs" },
    ],
    description:
      "Unser Botox-Kurs für Zahnärzt:innen ist Dein praxisnaher Einstieg in die zahnärztliche Botulinum-Anwendung. Im Online-Modul lernst Du Anatomie, Produktkunde und die Indikationen Deines Behandlungsspektrums, von Bruxismus über Migräne bis zu Glabella, Stirn und perioraler Ästhetik. Am Praxistag behandelst Du dann echte Proband:innen unter Aufsicht. Voraussetzung ist ausschließlich Deine Approbation als Zahnärzt:in. Vorerfahrung in ästhetischer Medizin brauchst Du nicht.",
    videoPath: grundkursBotulinumZahnmedizin.hero.videoPath,
    videoPoster: grundkursBotulinumZahnmedizin.hero.videoPoster,
  },

  lernziele: {
    heading: "LERNZIELE",
    audienceLabel: "Nur für approbierte Zahnärzt:innen",
    intro:
      "Nach unserem Botox-Kurs für Zahnärzt:innen kannst Du Bruxismus, Migräne und ausgewählte ästhetische Indikationen sicher, fundiert und diskriminierungssensibel mit Botulinum behandeln, auch wenn Du bisher noch keine ästhetische Medizin praktiziert hast. Im Fokus stehen folgende Lernziele:",
    items: grundkursBotulinumZahnmedizin.lernziele.items,
  },

  kursangeboteHeading: "UNSERE KURSANGEBOTE FÜR ZAHNÄRZT:INNEN",

  gruppenbuchungen: {
    heading: "GRUPPENBUCHUNGEN",
    description:
      "Zahnarztpraxis-Team, das gemeinsam in Botulinum einsteigen möchte? Gerne erstellen wir maßgeschneiderte Angebote für Dich und Deine Kolleg:innen. Sende uns dazu einfach eine Anfrage mit folgendem Inhalt: Anzahl Teilnehmer:innen (min. 4 Personen), gewünschter Kursinhalt, gewünschter Zeitraum.",
    ctaLabel: "Jetzt Anfrage senden",
    ctaHref:
      "mailto:customerlove@ephia.de?subject=Gruppenbuchung%20Botox-Kurs%20Zahn%C3%A4rzt:innen",
  },

  inhalt: grundkursBotulinumZahnmedizin.inhalt,

  learningPath: {
    heading: "DEIN LERNWEG",
    intro:
      "Vom ersten Onlinekurs bis zur ersten eigenen Patient:in: in drei klar strukturierten Schritten zum sicheren Einstieg in die zahnärztliche Botulinum-Behandlung.",
    steps: [
      {
        number: 1,
        icon: "BookOpen",
        format: "Onlinekurs · 10h",
        title: "Theorie in Deinem Tempo",
        description:
          "Anatomie der Kau- und mimischen Muskulatur, Produktkunde, dental-relevante Indikationen (Bruxismus, Migräne, Glabella, Stirn, periorale Zone) und Behandlungsvideos. Du lernst flexibel von zu Hause aus, bevor Du das erste Mal injizierst.",
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
          "Nach dem Kurs bleibst Du Teil unserer Ärzt:innen-Community mit eigenem Zahnärzt:innen-Austausch. Du kannst Fälle besprechen, Fragen zur Indikation und Abrechnung stellen und bekommst Rückendeckung von Dozent:innen, wenn es zählt.",
      },
    ],
  },

  lernplattform: grundkursBotulinumZahnmedizin.lernplattform,

  ctaBanner: {
    heading: "Bringe Botulinum in Deine Zahnarztpraxis.",
    ctaLabel: "Termine sehen",
    ctaHref: "#kursangebote",
  },

  testimonials: {
    heading: "PRAXISSTIMMEN",
    items: grundkursBotulinumZahnmedizin.testimonials.items,
  },

  faq: {
    heading: "FAQ",
    items: [
      {
        question:
          "Welche Botulinum-Indikationen darf ich als Zahnärzt:in behandeln?",
        answer:
          "Als Zahnärzt:in darfst Du Botulinum innerhalb Deines zahnärztlichen Behandlungsspektrums anwenden. Dazu zählen insbesondere Bruxismus (M. masseter), Migräne, Glabella, Stirn sowie die periorale Zone (Gummy Smile, Lip Flip, Mundwinkel). Behandlungen außerhalb des Kopf-Hals-Bereichs sind nicht Teil Deines Tätigkeitsfelds. Genaue Abgrenzungen ergeben sich aus dem jeweiligen Berufsrecht Deiner Zahnärztekammer. Im Zweifel empfehlen wir Dir eine Rücksprache mit Deiner Kammer und unsere Aufbaukurse für die jeweiligen Indikationen.",
      },
      {
        question:
          "Sind Bruxismus, Migräne und ästhetische Indikationen bei Zahnärzt:innen abrechenbar?",
        answer:
          "Ästhetische Botulinum-Behandlungen sind als IGeL-Leistungen (Selbstzahler:innen) abrechenbar. Funktionelle Indikationen wie ausgeprägter Bruxismus oder Spannungskopfschmerz können je nach Dokumentation und Indikationsstellung über Selbstzahler:innen oder, mit entsprechendem Befund, im Einzelfall über Heilfürsorge laufen. Die Erstattungsfähigkeit über die GKV ist im zahnärztlichen Bereich aktuell sehr eingeschränkt. Im Kurs zeigen wir Dir, wie wir Dokumentation und Aufklärung handhaben.",
      },
      {
        question:
          "Brauche ich eine Zusatzqualifikation, um Botulinum in der Zahnarztpraxis anzubieten?",
        answer:
          "In Deutschland gibt es aktuell keine gesonderte gesetzliche Zusatzqualifikation, die Du als approbierte Zahnärzt:in für Botulinum-Behandlungen nachweisen musst. Eine fundierte Fortbildung ist allerdings sowohl haftungsrechtlich als auch fachlich Pflicht. Unser EPHIA-Zertifikat dient Dir genau dafür: als Nachweis einer strukturierten, von Dozent:innen geprüften Fortbildung mit Praxistag an echten Proband:innen.",
      },
      {
        question:
          "Unterscheidet sich der Kurs vom Botox-Kurs für Humanmediziner:innen?",
        answer:
          "Ja. Der Botox-Kurs für Zahnärzt:innen ist explizit auf das zahnärztliche Behandlungsspektrum zugeschnitten: Bruxismus und Migräne sind eigene Kapitel, die im Humanmedizin-Kurs nicht enthalten sind. Im Gegenzug entfallen Inhalte wie Lachfalten, Brow-Lifting und Platysma, die außerhalb Deines Tätigkeitsfelds liegen. Die Praxistage finden gemeinsam mit Humanmediziner:innen im selben Studio statt, der Onlinekurs ist jedoch dental-spezifisch.",
      },
      ...grundkursBotulinumZahnmedizin.faq.items,
    ],
  },

  breadcrumbLabel: "Botox-Kurs für Zahnärzt:innen",
  relatedCourses: [
    "botox-kurs-fuer-aerzte",
    "botox-kurs-fuer-anfaenger",
    "botox-kurs-berlin",
  ],
};
