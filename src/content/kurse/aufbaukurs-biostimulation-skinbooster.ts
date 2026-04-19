import type { CourseLandingContent } from "./types";

/**
 * Aufbaukurs Biostimulation & Skinbooster landing page content.
 *
 * Praxis-only course (no Onlinekurs component), so the Lernplattform
 * section is intentionally left empty — page.tsx skips rendering it when
 * features.length === 0. The single booking widget card still pulls price
 * and availability from Supabase via courseKey = "aufbaukurs_skulptra".
 *
 * Copy adapted from the live www.ephia.de/aufbaukurs-sculptra page
 * structure; treatment-specific inhalt chapters lifted from the PDF.
 */
export const aufbaukursBiostimulationSkinbooster: CourseLandingContent = {
  slug: "aufbaukurs-biostimulation-skinbooster",
  courseKey: "aufbaukurs_skulptra",

  meta: {
    title: "Aufbaukurs Biostimulation & Skinbooster | EPHIA",
    description:
      "Aufbaukurs für approbierte Ärzt:innen: Biostimulation mit Poly-L-Milchsäure und Skinbooster-Techniken. Praxisnah, evidenzbasiert und CME-akkreditiert.",
    ogImage: "/kurse/aufbaukurs_skulptra/og-image.jpg",
  },

  hero: {
    heading: "AUFBAUKURS BIOSTIMULATION & SKINBOOSTER",
    subheadline:
      "Erweitere Dein Behandlungsspektrum um zwei moderne Regenerationsverfahren für Haut, Volumen und Hauttextur.",
    stats: [
      { icon: "Clock", label: "Format", value: "Praxiskurs" },
      { icon: "Award", label: "Akkreditiert", value: "CME beantragt + Zertifikat" },
      { icon: "GraduationCap", label: "Level", value: "Aufbaukurs" },
    ],
    description:
      "Dieser Aufbaukurs richtet sich an approbierte Humanmediziner:innen mit Grundkenntnissen in der ästhetischen Medizin. Im Fokus stehen Poly-L-Milchsäure-basierte Biostimulation und Skinbooster-Behandlungen zur Regeneration von Hautqualität, Spannkraft und Volumen. Du lernst die relevante Anatomie, Indikationen und Produktkenntnisse, spezifische Injektionstechniken für Gesicht, Hals und Dekolleté sowie diskriminierungssensible Patient:innenkommunikation und Komplikationsmanagement. Nach dem Kurs integrierst Du beide Verfahren sicher und evidenzbasiert in Deinen Behandlungsalltag.",
    videoPath:
      "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/aufbaukurs_skinbooster/4.%20Intro_Skinbooster_BioStim_V1-compressed.mp4",
    // Falling back to the Grundkurs Botulinum poster until a dedicated
    // frame is uploaded — same pattern used on Periorale Zone. Swap in a
    // proper poster once available.
    videoPoster: "/kurse/grundkurs_botulinum/hero-poster.jpg",
  },

  lernziele: {
    heading: "LERNZIELE",
    intro:
      "Dieser Praxiskurs richtet sich an approbierte Humanmediziner:innen und vermittelt die wichtigsten Kompetenzen, um Biostimulation und Skinbooster-Behandlungen sicher und zielgerichtet einzusetzen.",
    items: [
      {
        label: "Anatomie",
        icon: "BicepsFlexed",
        description:
          "Du lernst die anatomischen Strukturen des Gesichts, Halses und Dekolletés kennen, die für eine sichere Injektion relevant sind.",
      },
      {
        label: "Indikationen",
        icon: "ClipboardCheck",
        description:
          "Du kannst Indikationen und Kontraindikationen der Biostimulation und Skinbooster-Therapie sicher einschätzen und Behandlungen gezielt planen.",
      },
      {
        label: "Produktkenntnis",
        icon: "Syringe",
        description:
          "Du kennst die Eigenschaften gängiger Poly-L-Milchsäure- und Hyaluronsäure-basierten Skinbooster-Produkte und kannst sie differenziert einsetzen.",
      },
      {
        label: "Patient:innenkommunikation",
        icon: "MessageCircleHeart",
        description:
          "Du führst evidenzbasierte Beratungsgespräche, formulierst realistische Ziele und begleitest Deine Patient:innen strukturiert durch den mehrstufigen Behandlungsplan.",
      },
      {
        label: "Technik",
        icon: "Target",
        description:
          "Du beherrschst die spezifischen Injektionstechniken für Biostimulation und Skinbooster inklusive Rekonstitutions- und Massage-Protokollen.",
      },
      {
        label: "Komplikationsmanagement",
        icon: "ShieldAlert",
        description:
          "Du erkennst Frühzeichen für Komplikationen (Knötchenbildung, Überkorrektur, vaskuläre Zwischenfälle) und kannst strukturiert reagieren.",
      },
    ],
  },

  kursangeboteHeading: "UNSERE KURSANGEBOTE",

  gruppenbuchungen: {
    heading: "GRUPPENBUCHUNGEN",
    description:
      "Gerne erstellen wir auch maßgeschneiderte Angebote für Dich und Deine Kolleg:innen. Sende uns dazu einfach eine Anfrage mit folgendem Inhalt: Anzahl Teilnehmer:innen (min. 4 Personen), gewünschter Kursinhalt, gewünschter Zeitraum.",
    ctaLabel: "Jetzt Anfrage senden",
    ctaHref:
      "mailto:customerlove@ephia.de?subject=Gruppenbuchung%20Aufbaukurs%20Biostimulation%20%26%20Skinbooster",
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
              "Was Dich erwartet, Überblick über Aufbau und Lernziele des Kurses sowie Einführung in die beiden Behandlungsverfahren.",
          },
          {
            title: "Unsere Community",
            description:
              "Lerne von und mit anderen approbierten Ärzt:innen, Zugang zu Fallbesprechungen, Austausch und Updates aus der Praxis.",
          },
          {
            title: "Ablauf Praxisunterricht",
            description:
              "Wie der Praxiskurs aufgebaut ist und wie Du die Theorie direkt am Modell und an Patient:innen anwendest.",
          },
        ],
      },
      {
        number: 2,
        title: "Grundlagen Poly-L-Milchsäure und Skinbooster",
        subsections: [
          {
            title: "Wirkmechanismen der Biostimulation",
            description:
              "Wie Poly-L-Milchsäure die körpereigene Kollagenneubildung aktiviert, Unterschiede zu klassischen Fillern und zeitlicher Wirkverlauf.",
          },
          {
            title: "Skinbooster: Produkte & Wirkprinzipien",
            description:
              "Hyaluronsäure-basierte Skinbooster, ihre rheologischen Eigenschaften und Einsatzgebiete zur Verbesserung von Hauttextur und -hydratation.",
          },
          {
            title: "Indikationen & Kontraindikationen",
            description:
              "Hautalterung, Volumenverlust, Dehnungsstreifen, schlaffe Hautareale an Gesicht, Hals und Dekolleté, Abgrenzung zu anderen Verfahren.",
          },
          {
            title: "Rekonstitution & Aufbewahrung",
            description:
              "Korrekte Anmischung und Lagerung von Poly-L-Milchsäure, Zeitfenster bis zur Injektion, typische Fehlerquellen.",
          },
          {
            title: "Patient:innenberatung & Kombinationsmöglichkeiten",
            description:
              "Wie Du realistische Erwartungen setzt, Mehrstufen-Protokolle planst und Biostimulation mit Botulinum, Fillern und Skinbooster kombinierst.",
          },
        ],
      },
      {
        number: 3,
        title: "Behandlung",
        subsections: [
          {
            title: "Anzeichnen & Behandlungsplanung",
            description:
              "Systematisches Anzeichnen der Behandlungsareale, Dosierung pro Zone und individuelle Planung auf Basis des Hautbefundes.",
          },
          {
            title: "Biostimulation im Mittelgesicht & an der Wange",
            description:
              "Injektionstechnik, Tiefenebene und Dosisempfehlung für die Regeneration des Mittelgesichts und der Wangenregion.",
          },
          {
            title: "Biostimulation an Hals & Dekolleté",
            description:
              "Behandlung der häufig vernachlässigten Bereiche Hals und Dekolleté zur Gesamt-Harmonisierung des Erscheinungsbildes.",
          },
          {
            title: "Skinbooster-Behandlung im Gesicht",
            description:
              "Mikroinjektionstechniken für die Verbesserung von Hautqualität, Spannkraft und Strahlkraft.",
          },
          {
            title: "Massage & Nachsorge",
            description:
              "Korrekte Massagetechnik nach der Biostimulation und strukturierte Nachsorge-Instruktionen für Deine Patient:innen.",
          },
        ],
      },
    ],
  },

  // Praxis-only course — no online learning platform to showcase.
  // page.tsx skips this section when features is empty.
  lernplattform: {
    heading: "AUFBAU UNSERER LERNPLATTFORM",
    features: [],
  },

  ctaBanner: {
    heading: "Bring Dein Fachwissen auf die nächste Stufe!",
    ctaLabel: "Zu den Angeboten",
    ctaHref: "#kursangebote",
  },

  testimonials: {
    heading: "#wearetogether",
    subheading: "Was dich bei uns ausgezeichnete Ärzt:innen sagen",
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
          "Muss ich approbierte Ärzt:in / approbierter Arzt sein, um an dem Kurs teilnehmen zu können?",
        answer:
          "Ja. Biostimulation und Skinbooster-Behandlungen sind ärztliche Leistungen und unsere Kurse richten sich ausschließlich an approbierte Humanmediziner:innen. Bitte halte Deine Approbationsurkunde beim Check-in bereit.",
      },
      {
        question:
          "Muss ich eine Proband:in / einen Probanden zum Kurs mitbringen?",
        answer:
          "Nein. EPHIA stellt Proband:innen zur Verfügung, an denen Du unter Anleitung die verschiedenen Techniken üben kannst. Wenn Du trotzdem eine eigene Proband:in mitbringen möchtest (z.B. aus der eigenen Praxis), ist das ebenfalls möglich, schreib uns dazu einfach kurz im Voraus an customerlove@ephia.de.",
      },
      {
        question:
          "Kann ich direkt nach dem Kurs meine eigenen Patient:innen behandeln?",
        answer:
          "Nach erfolgreichem Abschluss des Praxiskurses bist Du in der Lage, Biostimulation und Skinbooster sicher und strukturiert in Deine Praxis zu integrieren. Wir empfehlen Dir, mit einfachen Indikationen zu starten und komplexe Fälle schrittweise in Dein Repertoire aufzunehmen. Beachte die rechtlichen und berufsrechtlichen Rahmenbedingungen in Deinem Land bzw. Deiner Region.",
      },
      {
        question:
          "Ist mein:e Proband:in für den Kurs geeignet?",
        answer:
          "Deine Proband:in sollte volljährig sein, keine akuten Hauterkrankungen im Behandlungsareal haben, nicht schwanger oder in der Stillzeit sein und mit Vorher-/Nachher-Fotos zur internen Dokumentation einverstanden sein. Wir empfehlen außerdem, dass die zu behandelnden Areale in den vergangenen 6 Monaten keine Behandlung mit Poly-L-Milchsäure oder vergleichbaren Produkten erhalten haben.",
      },
    ],
  },
};
