import type { CourseLandingContent } from "./types";
import { aufbaukursBotulinumPerioraleZone } from "./aufbaukurs-botulinum-periorale-zone";

/**
 * Masterclass Botulinum landing page content.
 *
 * Top tier of the Botulinum curriculum. Pulls price + sessions from
 * Supabase via courseKey = "masterclass_botulinum" (template already
 * configured in the admin tool). Kombikurs format: comprehensive online
 * curriculum + advanced Praxiskurs in Berlin.
 *
 * Structure mirrors the live www.ephia.de/masterclass-botulinum page.
 * Hero video poster falls back to the Grundkurs Botulinum frame until a
 * dedicated Masterclass asset is uploaded (same pattern as Skinbooster
 * and Periorale Zone). Swap in once available.
 */
export const masterclassBotulinum: CourseLandingContent = {
  slug: "masterclass-botulinum",
  courseKey: "masterclass_botulinum",

  meta: {
    title: "Masterclass Botulinum | EPHIA",
    description:
      "Masterclass Botulinum für erfahrene Ärzt:innen: Full Face Analyse, fortgeschrittene Injektionstechniken und Komplikationsmanagement auf Expert:innen-Niveau. Praxiskurs in Berlin-Mitte mit Online-Vorbereitung.",
    ogImage: "/kurse/masterclass_botulinum/og-image.jpg",
  },

  hero: {
    heading: "MASTERCLASS BOTULINUM",
    subheadline:
      "Feinschliff auf Expert:innen-Niveau: Full Face Analyse, fortgeschrittene Techniken und souveränes Komplikationsmanagement.",
    stats: [
      { icon: "Clock", label: "Format", value: "Online- und als Praxiskurs" },
      { icon: "Award", label: "Akkreditiert", value: "CME beantragt + Zertifikat" },
      { icon: "GraduationCap", label: "Level", value: "Masterclass" },
    ],
    description:
      "Diese Masterclass richtet sich an approbierte Ärzt:innen, die bereits regelmäßig mit Botulinum behandeln und ihr Können auf Expert:innen-Niveau heben möchten. Im Fokus stehen die ganzheitliche Full Face Analyse, fortgeschrittene Injektionstechniken für komplexe Indikationen, eine vertiefte Behandlungsstrategie über mehrere Sitzungen hinweg sowie strukturiertes Komplikationsmanagement. Du arbeitest unter Anleitung erfahrener Dozent:innen direkt an Patient:innen, profitierst vom Austausch in einer kleinen Gruppe und integrierst neue Behandlungskonzepte sicher in Deinen Praxisalltag.",
    videoPath:
      "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/masterclass_botulinum/3.%20Intro_Masterclass_V1_compressed.mp4",
    // Poster falls back to the Grundkurs Botulinum frame until a
    // dedicated Masterclass poster is uploaded.
    videoPoster: "/kurse/grundkurs_botulinum/hero-poster.jpg",
  },

  lernziele: {
    heading: "LERNZIELE",
    intro:
      "Die Masterclass setzt fundierte Vorerfahrung in der Botulinum-Behandlung voraus. Im Kurs vertiefst Du die folgenden sechs Kompetenzfelder auf Expert:innen-Niveau:",
    items: [
      {
        label: "Full Face Analyse",
        icon: "ScanFace",
        description:
          "Du analysierst das Gesicht ganzheitlich, erkennst Bewegungsmuster und Asymmetrien und leitest daraus eine zonenübergreifende Behandlungsstrategie ab.",
      },
      {
        label: "Akute Indikationen",
        icon: "ClipboardCheck",
        description:
          "Du beherrschst fortgeschrittene und seltenere Indikationen sicher und kannst sie evidenzbasiert von klassischen Standardbehandlungen abgrenzen.",
      },
      {
        label: "Behandlungsstrategie",
        icon: "Target",
        description:
          "Du planst mehrstufige Behandlungskonzepte, kombinierst Botulinum sinnvoll mit anderen Verfahren und steuerst Ergebnisse über mehrere Sitzungen hinweg.",
      },
      {
        label: "Anatomie",
        icon: "BicepsFlexed",
        description:
          "Du vertiefst Dein Verständnis der mimischen Muskulatur, ihrer Vektoren und der Risikoregionen, um auch komplexe Areale präzise zu behandeln.",
      },
      {
        label: "Patient:innenkommunikation",
        icon: "MessageCircleHeart",
        description:
          "Du führst Beratungsgespräche bei komplexen Wünschen souverän, formulierst realistische Ziele und gehst mit hohen Erwartungen evidenzbasiert um.",
      },
      {
        label: "Komplikationsmanagement",
        icon: "ShieldAlert",
        description:
          "Du erkennst Komplikationen frühzeitig, hast klare Handlungspfade für den Ernstfall parat und führst strukturierte Korrekturbehandlungen durch.",
      },
    ],
  },

  kursangeboteHeading: "UNSER KURSANGEBOT",

  gruppenbuchungen: {
    heading: "GRUPPENBUCHUNGEN",
    description:
      "Gerne erstellen wir auch maßgeschneiderte Angebote für Dich und Deine Kolleg:innen. Sende uns dazu einfach eine Anfrage mit folgendem Inhalt: Anzahl Teilnehmer:innen (min. 4 Personen), gewünschter Kursinhalt, gewünschter Zeitraum.",
    ctaLabel: "Jetzt Anfrage senden",
    ctaHref:
      "mailto:customerlove@ephia.de?subject=Gruppenbuchung%20Masterclass%20Botulinum",
  },

  inhalt: {
    heading: "INHALT PRAXISKURS",
    chapters: [
      {
        number: 1,
        title: "Begrüßung & Kursübersicht",
        subsections: [
          {
            title: "Kurseinführung",
            description:
              "Was Dich erwartet, Überblick über Aufbau und Lernziele der Masterclass und Einordnung im Botulinum-Curriculum.",
          },
          {
            title: "Unsere Community",
            description:
              "Lerne von und mit anderen erfahrenen Ärzt:innen, Zugang zu Fallbesprechungen, Austausch und Updates aus der Praxis.",
          },
          {
            title: "Ablauf Praxisunterricht",
            description:
              "Wie der Praxiskurs aufgebaut ist, wie Theorie, Demonstration und eigene Behandlungen ineinandergreifen und welche Rolle die Online-Vorbereitung spielt.",
          },
        ],
      },
      {
        number: 2,
        title: "Grundlagen Full Face Analyse & Behandlungsplanung",
        subsections: [
          {
            title: "Full Face Analyse in der Praxis",
            description:
              "Strukturierte Beurteilung mimischer Muskelaktivität, Asymmetrien und individueller Bewegungsmuster als Grundlage für eine ganzheitliche Behandlungsstrategie.",
          },
          {
            title: "Zonenübergreifende Behandlungsstrategie",
            description:
              "Wie Du Botulinum-Punkte über mehrere Areale hinweg konsistent platzierst, Wechselwirkungen zwischen Zonen berücksichtigst und Über- bzw. Unterkorrektur vermeidest.",
          },
          {
            title: "Mehrstufige Behandlungskonzepte",
            description:
              "Planung über mehrere Sitzungen, Steuerung von Wirkungseintritt und -verlauf und Integration von Folge- und Korrekturterminen.",
          },
          {
            title: "Patient:innenberatung bei komplexen Wünschen",
            description:
              "Realistische Zielsetzung, Aufklärung über Grenzen und Risiken sowie strukturierte Dokumentation auch bei anspruchsvollen Patient:innen.",
          },
        ],
      },
      {
        number: 3,
        title: "Behandlung",
        subsections: [
          {
            title: "Anzeichnen für die ganzheitliche Behandlung",
            description:
              "Systematisches Anzeichnen aller relevanten Punkte im Rahmen einer Full Face Behandlung, abgestimmt auf die individuelle Anatomie der Patient:in.",
          },
          {
            title: "Fortgeschrittene Injektionstechniken",
            description:
              "Tiefenebene, Stichrichtung und Dosierung für komplexe und seltenere Indikationen direkt am Modell und unter 1:1-Anleitung.",
          },
          {
            title: "Live-Behandlung an Patient:innen",
            description:
              "Du behandelst unter Aufsicht erfahrener Dozent:innen echte Patient:innen, erhältst direktes Feedback und reflektierst jeden Behandlungsschritt im Team.",
          },
          {
            title: "Komplikationsmanagement",
            description:
              "Strukturiertes Vorgehen bei Asymmetrien, Ptosis, vaskulären Zwischenfällen und anderen Komplikationen, inklusive Notfallprotokoll und Korrekturbehandlung.",
          },
        ],
      },
    ],
  },

  // Reuses the Aufbaukurs Periorale Zone curriculum by reference — the
  // Masterclass Onlinekurs IS the Periorale Zone online course. Editing
  // the Periorale Zone chapters automatically updates this section.
  inhaltOnline: {
    heading: "INHALT ONLINEKURS",
    intro:
      "Der Onlinekurs der Masterclass Botulinum entspricht inhaltlich dem Aufbaukurs Periorale Zone. Solltest Du den Onlinekurs bereits absolviert haben, kannst Du direkt den Praxiskurs buchen.",
    chapters: aufbaukursBotulinumPerioraleZone.inhalt.chapters,
  },

  // Lernplattform showcase mirrors the Aufbaukurs Periorale Zone page
  // exactly — the Masterclass Onlinekurs IS the Periorale Zone course,
  // so the platform features and screenshots match. Reused by reference
  // so future edits to Periorale Zone flow through automatically.
  lernplattform: aufbaukursBotulinumPerioraleZone.lernplattform,

  ctaBanner: {
    heading: "Bring Dein Fachwissen auf die nächste Stufe!",
    ctaLabel: "Zu den Angeboten",
    ctaHref: "#kursangebote",
  },

  testimonials: {
    heading: "#wearetogether",
    subheading: "Was über uns ausgezeichnete Ärzt:innen sagen",
    items: [
      {
        quote:
          "Der Grundkurs Botulinum war der erste Kurs der Dr. Sophia Academy, den ich besucht habe und er hat mich sehr überzeugt! Besonders gut fand ich die praktischen Übungen an Proband:innen und die 1:1 Begleitung durch Dr. Sophia! Auch die Erklärung der MD-Codes fand ich sehr aufschlussreich. Ich fühle mich wirklich bestens vorbereitet, meine ersten Patient:innen zu behandeln.",
        name: "Dr. Laura Bergeest",
        title: "Ärztin in der Inneren Medizin",
        photoPath: "/kurse/grundkurs_botulinum/testimonials/testimonial-1.png",
      },
      {
        quote:
          "Ich liebe Sophias diversen und individuellen Ansatz an die ästhetische Medizin. Bei ihr steht der Mensch mit seinen ganz eigenen Vorstellungen und Wünschen im Zentrum der Behandlung, keine vorgefertigten „Schemata\". Ihre Kurse waren eine perfekte Kombination aus Theorie und Praxis und wurden mit großer fachlicher Kompetenz und viel Herzblut kuratiert.",
        name: "Nadja Geuther",
        title: "Ärztin in der Dermatologie",
        photoPath: "/kurse/grundkurs_botulinum/testimonials/testimonial-2.jpg",
      },
      {
        quote:
          "Sophias Kurs war sehr aufschlussreich für mich. Die detaillierte Erklärung der anatomischen Grundlagen und die praktischen Übungen haben meine Fähigkeiten deutlich verbessert. Besonders hilfreich fand ich die persönliche Betreuung und das Feedback während der Hands-on-Trainingseinheiten. Der Kurs hat mir das Vertrauen gegeben, meine neuen Fähigkeiten in der Praxis anzuwenden.",
        name: "Lawik Revend",
        title: "Arzt in der Chirurgie",
        photoPath: "/kurse/grundkurs_botulinum/testimonials/testimonial-3.png",
      },
    ],
  },

  faq: {
    heading: "FAQ",
    items: [
      {
        question:
          "Muss ich approbierte Ärzt:in / approbierter Arzt sein, um an der Masterclass teilnehmen zu können?",
        answer:
          "Ja. Die Masterclass richtet sich ausschließlich an approbierte Humanmediziner:innen mit fundierter Vorerfahrung in der Botulinum-Behandlung. Bitte halte Deine Approbationsurkunde beim Check-in bereit.",
      },
      {
        question:
          "Welche Vorerfahrung sollte ich für die Masterclass mitbringen?",
        answer:
          "Wir empfehlen, dass Du bereits regelmäßig mit Botulinum behandelst und mit den klassischen Indikationen (Stirn, Glabella, Lachfalten) sicher umgehen kannst. Idealerweise hast Du zuvor unseren Grundkurs sowie einen Aufbaukurs (z.B. Therapeutische Indikationen oder Periorale Zone) absolviert oder verfügst über vergleichbare praktische Erfahrung.",
      },
      {
        question:
          "Muss ich eine Proband:in / einen Probanden zum Kurs mitbringen?",
        answer:
          "Nein. EPHIA stellt Proband:innen zur Verfügung, an denen Du unter Anleitung die fortgeschrittenen Techniken üben kannst. Wenn Du trotzdem eine eigene Proband:in mitbringen möchtest (z.B. aus der eigenen Praxis), ist das ebenfalls möglich, schreib uns dazu einfach kurz im Voraus an customerlove@ephia.de.",
      },
      {
        question:
          "Kann ich direkt nach dem Kurs meine eigenen Patient:innen behandeln?",
        answer:
          "Nach erfolgreichem Abschluss der Masterclass bist Du in der Lage, fortgeschrittene Behandlungskonzepte sicher in Deine Praxis zu integrieren. Wir empfehlen Dir, neue Techniken schrittweise in Dein Repertoire aufzunehmen und komplexe Fälle zunächst gemeinsam in der Community zu besprechen. Beachte die rechtlichen und berufsrechtlichen Rahmenbedingungen in Deinem Land bzw. Deiner Region.",
      },
      {
        question:
          "Ist mein:e Proband:in für den Kurs geeignet?",
        answer:
          "Deine Proband:in sollte volljährig sein, keine akuten Hauterkrankungen im Behandlungsareal haben, nicht schwanger oder in der Stillzeit sein und mit Vorher-/Nachher-Fotos zur internen Dokumentation einverstanden sein. Da wir mit funktioneller Anatomie arbeiten, sollte die Muskelaktivität gut sichtbar sein, idealerweise also keine frische Botulinum-Behandlung in den vergangenen Monaten.",
      },
    ],
  },

  relatedCourses: [
    "grundkurs-botulinum",
    "aufbaukurs-botulinum-periorale-zone",
    "aufbaukurs-therapeutische-indikationen-botulinum",
  ],
};
