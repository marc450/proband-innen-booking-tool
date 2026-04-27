import type { CourseLandingContent } from "./types";
import { grundkursBotulinum } from "./grundkurs-botulinum";

/**
 * Botox-Kurs für Ärzt:innen — SEO-targeted persona landing page.
 *
 * Targets the broad umbrella search term "Botox Kurs für Ärzte" and
 * variants ("Botox Kurs Arzt", "Botox Fortbildung Ärzte", "Botox
 * Schulung Ärzte"). This is the entry-point landing for any
 * approbierte:r Humanmediziner:in who Googles the umbrella term
 * without a level qualifier (anfänger/fortgeschrittene).
 *
 * Re-uses the Grundkurs Botulinum Supabase template
 * (`grundkurs_botulinum`) so regular sessions, full Inhalt and the
 * curriculum banner come along automatically. ~30-40% unique copy on
 * top:
 *   - Hero, lernziele intro: umbrella framing for Humanmediziner:innen
 *   - LearningPath: 3 steps, only prereq is Approbation als Ärzt:in
 *   - FAQ: prepended with 4 umbrella Q&A (legal scope,
 *     Zusatzbezeichnung, Vorerfahrung, Abgrenzung Zahnärzt:innen)
 *
 * NOTE: This is a performance landing page, so "Botox" usage is
 * permitted per CI. Main pages (e.g. /kurse/grundkurs-botulinum) must
 * NOT use "Botox", only "Botulinum".
 */
export const botoxKursFuerAerzte: CourseLandingContent = {
  slug: "botox-kurs-fuer-aerzte",
  // Same Supabase template as the Grundkurs Botulinum, the booking
  // widget pulls real sessions automatically.
  courseKey: "grundkurs_botulinum",

  meta: {
    title: "Botox-Kurs für Ärzt:innen, Einstieg & Aufbau | EPHIA",
    description:
      "Botox-Kurs für approbierte Ärzt:innen: Stirn, Glabella, Lachfalten, Brow-Lifting und mehr. Online-Modul plus Praxistag an echten Proband:innen, kleine Gruppen, 22 CME-Punkte und EPHIA-Zertifikat.",
    ogImage: "/kurse/grundkurs_botulinum/og-image.jpg",
  },

  hero: {
    heading: "BOTOX-KURS FÜR\nÄRZT:INNEN",
    socialProof: "Über 300 zertifizierte Ärzt:innen",
    ctaStacked: true,
    subheadline:
      "Praxisnahe Botox-Fortbildung für approbierte Ärzt:innen, fundiert, diskriminierungssensibel und mit echten Proband:innen.",
    stats: [
      { icon: "Clock", label: "Format", value: "10h Online + 6h Präsenz" },
      { icon: "Award", label: "Akkreditiert", value: "22 CME-Punkte + Zertifikat" },
      { icon: "GraduationCap", label: "Level", value: "Einsteigerkurs" },
    ],
    description:
      "Du bist approbierte:r Ärzt:in und möchtest mit Botox-Behandlungen einsteigen? Unser Botox-Kurs für Ärzt:innen ist Dein strukturierter Weg vom ersten Onlinekurs bis zur sicheren Behandlung Deiner ersten Patient:innen. Im Online-Modul lernst Du Anatomie, Produktkunde und alle relevanten Indikationen Stirn, Glabella, Lachfalten, Brow-Lifting und Platysma. Am Praxistag behandelst Du dann echte Proband:innen unter Aufsicht, in kleinen Gruppen mit max. 7 Teilnehmer:innen. Voraussetzung ist Deine Approbation als Humanmediziner:in. Vorerfahrung in ästhetischer Medizin brauchst Du nicht.",
    videoPath: grundkursBotulinum.hero.videoPath,
    videoPoster: grundkursBotulinum.hero.videoPoster,
  },

  lernziele: {
    heading: "LERNZIELE",
    audienceLabel: "Nur für approbierte Ärzt:innen",
    intro:
      "Nach unserem Botox-Kurs für Ärzt:innen kannst Du Deine ersten Patient:innen sicher, fundiert und diskriminierungssensibel mit Botulinum behandeln, auch wenn Du bisher noch keine ästhetische Medizin praktiziert hast. Im Fokus stehen folgende Lernziele:",
    items: grundkursBotulinum.lernziele.items,
  },

  kursangeboteHeading: "UNSERE KURSANGEBOTE FÜR ÄRZT:INNEN",

  gruppenbuchungen: {
    heading: "GRUPPENBUCHUNGEN",
    description:
      "Praxisteam, das gemeinsam die ersten Botox-Behandlungen anbieten möchte? Gerne erstellen wir maßgeschneiderte Angebote für Dich und Deine Kolleg:innen. Sende uns dazu einfach eine Anfrage mit folgendem Inhalt: Anzahl Teilnehmer:innen (min. 4 Personen), gewünschter Kursinhalt, gewünschter Zeitraum.",
    ctaLabel: "Jetzt Anfrage senden",
    ctaHref:
      "mailto:customerlove@ephia.de?subject=Gruppenbuchung%20Botox-Kurs%20%C3%84rzt:innen",
  },

  inhalt: grundkursBotulinum.inhalt,

  learningPath: {
    heading: "DEIN LERNWEG",
    intro:
      "Vom ersten Onlinekurs bis zur ersten eigenen Patient:in: in drei klar strukturierten Schritten zum sicheren Einstieg in die ästhetische Botox-Behandlung.",
    steps: [
      {
        number: 1,
        icon: "BookOpen",
        format: "Onlinekurs · 10h",
        title: "Theorie in Deinem Tempo",
        description:
          "Anatomie der mimischen Muskulatur, Produktkunde, alle relevanten Indikationen (Stirn, Glabella, Lachfalten, Brow-Lifting, Platysma) und Behandlungsvideos. Du lernst flexibel von zu Hause aus, bevor Du das erste Mal injizierst.",
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
          "Nach dem Kurs bleibst Du Teil unserer Ärzt:innen-Community. Du kannst Fälle besprechen, Fragen zur Indikation und Abrechnung stellen und bekommst Rückendeckung von Dozent:innen, wenn es zählt.",
      },
    ],
  },

  lernplattform: grundkursBotulinum.lernplattform,

  ctaBanner: {
    heading: "Bring Dein Fachwissen auf die nächste Stufe!",
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
        question: "Wer darf in Deutschland Botox spritzen?",
        answer:
          "Ästhetische Botulinum-Behandlungen sind in Deutschland approbierten Humanmediziner:innen und Zahnärzt:innen vorbehalten. Heilpraktiker:innen oder Kosmetiker:innen dürfen Botulinum nicht injizieren. Innerhalb dieses Rahmens ist eine fundierte Fortbildung sowohl haftungsrechtlich als auch fachlich Pflicht. Unser EPHIA-Zertifikat dient genau dafür: als Nachweis einer strukturierten, von Dozent:innen geprüften Fortbildung mit Praxistag an echten Proband:innen.",
      },
      {
        question:
          "Brauche ich eine Zusatzbezeichnung Ästhetische Medizin, um Botulinum anzubieten?",
        answer:
          "Nein. In Deutschland gibt es aktuell keine gesetzlich vorgeschriebene Zusatzbezeichnung für die ästhetische Botulinum-Anwendung. Als approbierte:r Ärzt:in darfst Du Botulinum injizieren, sofern Du Dich entsprechend fortgebildet hast und Deinen berufsrechtlichen Rahmen kennst. Die Bezeichnung „Ästhetische Medizin\" ist eine freiwillige Zertifizierung verschiedener Fachgesellschaften und keine Voraussetzung für die Behandlung.",
      },
      {
        question:
          "Kann ich auch ohne Vorerfahrung in ästhetischer Medizin starten?",
        answer:
          "Ja. Unser Botox-Kurs für Ärzt:innen ist explizit als Einsteigerkurs konzipiert. Voraussetzung ist ausschließlich Deine Approbation als Humanmediziner:in. Wir starten bei den anatomischen Grundlagen, gehen Schritt für Schritt durch jede Indikation und Du injizierst am Praxistag in kleinen Gruppen unter direkter Aufsicht. Viele unserer Teilnehmer:innen kommen aus Allgemeinmedizin, Innerer Medizin, Chirurgie oder Dermatologie und steigen mit diesem Kurs in die ästhetische Medizin ein.",
      },
      {
        question:
          "Worin unterscheidet sich der Kurs für Ärzt:innen von dem für Zahnärzt:innen?",
        answer:
          "Der Botox-Kurs für Ärzt:innen deckt das volle ästhetische Indikationsspektrum ab: Stirn, Glabella, Lachfalten, Brow-Lifting und Platysma. Der Kurs für Zahnärzt:innen ist auf das zahnärztliche Behandlungsspektrum zugeschnitten, mit eigenen Kapiteln zu Bruxismus und Migräne, dafür ohne Lachfalten, Brow-Lifting und Platysma. Die Praxistage finden gemeinsam im selben Studio statt, der Onlinekurs ist jedoch fachgruppenspezifisch.",
      },
      ...grundkursBotulinum.faq.items,
    ],
  },

  breadcrumbLabel: "Botox-Kurs für Ärzt:innen",
};
