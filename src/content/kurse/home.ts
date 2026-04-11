import type { HomeContent } from "./home-types";

/**
 * Home page content for kurse.ephia.de (shadow marketing site).
 *
 * Most course tiles currently link out to the live LearnWorlds pages on
 * www.ephia.de. As shadow pages replace them, swap the `href` to an
 * internal path (e.g. "/grundkurs-botulinum").
 */
export const homeContent: HomeContent = {
  meta: {
    title: "EPHIA — Akademie für ästhetische Medizin",
    description:
      "Deine Lernplattform für inklusive ästhetische Medizin. LÄK-zertifizierte Lehrgänge, On- & Offlinekurse und eine aktive Ärzt:innen-Community.",
    ogImage: "/kurse/home/og-image.jpg",
  },

  hero: {
    eyebrow: "EPHIA Akademie · Für approbierte Ärzt:innen",
    heading: "Deine Lernplattform für inklusive ästhetische Medizin",
    checklist: [
      { text: "LÄK-zertifizierte Lehrgänge" },
      { text: "On- & Offlinekurse" },
      { text: "Aktive Ärzt:innen-Community" },
    ],
    ctaLabel: "Zu unseren Kursen ↓",
    ctaHref: "#unsere-kurse",
    imagePath:
      "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/home/hero.png",
    imageAlt: "Drei Ärzt:innen im warmen Sonnenlicht",
  },

  werWirSind: {
    eyebrow: "Hinter EPHIA · Dr. Sophia Wilk-Vollmann",
    heading: "WER WIR SIND",
    subheading: "„Ästhetische Medizin neu denken.\"",
    videoPath:
      "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/home/wer-wir-sind-web.mp4?v=2",
    personName: "Dr. Sophia Wilk-Vollmann",
    personTitle: "Gründerin von EPHIA",
  },

  courses: {
    eyebrow: "LÄK-zertifiziert · Für approbierte Ärzt:innen",
    heading: "UNSERE KURSE",
    intro:
      "Grundkurse sind Einstiegskurse für Einsteiger:innen. Für Aufbaukurse empfehlen wir ein solides medizinisches Basiswissen vor der Kursteilnahme.",
    tiles: [
      {
        kicker: "GRUNDKURS",
        title: "BOTULINUM",
        audience: "Für Humanmediziner:innen",
        description:
          "Dieser Grundkurs richtet sich an approbierte Humanmediziner:innen, die erste Schritte in der Behandlung von Patient:innen mit Botulinum („Botox\") gehen möchten oder ihr Basiswissen auffrischen wollen. Du lernst die Grundlagen der ästhetischen Anwendung von Botulinum und erhältst praxisorientierte Einblicke.",
        courseKey: "grundkurs_botulinum",
        imageAlt: "Grundkurs Botulinum für Humanmediziner:innen",
        ctaLabel: "Zu den Kursdetails",
        href: "/grundkurs-botulinum",
      },
      {
        kicker: "GRUNDKURS",
        title: "BOTULINUM",
        audience: "Für Zahnmediziner:innen",
        description:
          "Dieser Grundkurs richtet sich an approbierte Zahnärzt:innen, die erste Schritte in der Behandlung von Patient:innen mit Botulinum („Botox\") gehen möchten oder ihr Basiswissen auffrischen wollen. Du lernst die Grundlagen der zahnärztlichen Anwendung von Botulinum und erhältst praxisorientierte Einblicke.",
        courseKey: "grundkurs_botulinum_zahnmedizin",
        imageAlt: "Grundkurs Botulinum für Zahnmediziner:innen",
        ctaLabel: "Zu den Kursdetails",
        href: "https://www.ephia.de/grundkurs-botulinum-zahnmedizin",
      },
      {
        kicker: "GRUNDKURS",
        title: "DERMALFILLER",
        audience: "Für Kurseinsteiger:innen",
        description:
          "Dieser Grundkurs richtet sich an approbierte Ärzt:innen, die erste Schritte in der Behandlung von Patient:innen mit Dermalfillern gehen möchten oder ihr Basiswissen auffrischen wollen. Du lernst die Anatomie des Alterns, die Behandlungsmöglichkeiten für das Mittelgesicht und erste Schritte in die Gesichtskonturierung kennen.",
        courseKey: "grundkurs_dermalfiller",
        imageAlt: "Grundkurs Dermalfiller",
        ctaLabel: "Zu den Kursdetails",
        href: "https://www.ephia.de/grundkurs-dermalfiller",
      },
      {
        kicker: "AUFBAUKURS",
        title: "Skulptra & Skinbooster",
        audience: "Für fortgeschrittene Ärzt:innen",
        description:
          "Dieser Aufbaukurs richtet sich an approbierte Ärzt:innen, die ihre Kenntnisse in der ästhetischen Medizin erweitern und moderne Methoden der Biostimulation mit Poly-Milchsäure und Skinboostern kennenlernen möchten. Du lernst Grundlagen der Kollagenstimulation und Behandlungsmöglichkeiten für Gesicht und Dekolleté kennen.",
        courseKey: "aufbaukurs_skulptra",
        imageAlt: "Aufbaukurs Skulptra & Skinbooster",
        ctaLabel: "Zu den Kursdetails",
        href: "https://www.ephia.de/aufbaukurs-sculptra-skinbooster",
      },
      {
        kicker: "GRUNDKURS",
        title: "MED. HAUTPFLEGE",
        audience: "Für Kurseinsteiger:innen",
        description:
          "Der Grundkurs Medizinische Hautpflege richtet sich an approbierte Ärzt:innen, die ihr Wissen in medizinischer Hautpflege vertiefen möchten. Du lernst, Hautzustände wie Akne, Rosazea und Periorale Dermatitis sicher zu erkennen und zu behandeln. Denn nur auf gesunder Haut können ästhetische Behandlungen ihr volles Potenzial entfalten.",
        courseKey: "grundkurs_medizinische_hautpflege",
        imageAlt: "Grundkurs Medizinische Hautpflege",
        ctaLabel: "Zu den Kursdetails",
        href: "https://www.ephia.de/grundkurs-medizinische-hautpflege",
      },
      {
        kicker: "AUFBAUKURS",
        title: "BOTULINUM",
        audience: "Therapeutische Indikationen",
        description:
          "Dieser Aufbaukurs richtet sich an approbierte Ärzt:innen, die ihre Kenntnisse in der ästhetischen Medizin erweitern und moderne Methoden der Biostimulation mit Poly-Milchsäure und Skinboostern kennenlernen möchten. Du lernst Grundlagen der Kollagenstimulation und Behandlungsmöglichkeiten für Gesicht und Dekolleté kennen.",
        courseKey: "aufbaukurs_therapeutische_indikationen_botulinum",
        imageAlt: "Aufbaukurs Botulinum Therapeutische Indikationen",
        ctaLabel: "Zu den Kursdetails",
        href: "https://www.ephia.de/aufbaukurs-botulinum-therapeutische-indikationen",
      },
      {
        kicker: "AUFBAUKURS",
        title: "BOTULINUM",
        audience: "Periorale Zone",
        description:
          "Dieser Aufbaukurs richtet sich an approbierte Ärzt:innen, die bereits über Grundkenntnisse in der Myomodulation verfügen und sie gezielt vertiefen möchten. Du lernst die sichere, evidenzbasierte Behandlung der perioralen Zone, inklusive Gummy Smile, Lip Flip, Erdbeerkinn und Behandlung der Mundwinkel.",
        courseKey: "aufbaukurs_botulinum_periorale_zone",
        imageAlt: "Aufbaukurs Botulinum Periorale Zone",
        ctaLabel: "Zu den Kursdetails",
        href: "https://www.ephia.de/aufbaukurs-botulinum-periorale-zone",
      },
      {
        kicker: "GRUPPENBUCHUNGEN",
        title: "GRUPPENBUCHUNGEN",
        audience: "Für private Kurse",
        description:
          "Du möchtest mit Kolleg:innen und/oder Freund:innen gemeinsam lernen? Kein Problem! Auf Deinen Wunsch organisieren wir exklusive Gruppenkurse für Teams und Praxen ab vier Teilnehmer:innen und stimmen Inhalte sowie Termine individuell auf Eure Bedürfnisse und Euren Wissensstand ab.",
        imagePath:
          "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/home/gruppenbuchungen.png",
        imageAlt: "Gruppenbuchungen für private Kurse",
        ctaLabel: "Jetzt Anfrage senden",
        type: "group-inquiry",
      },
    ],
  },

  fokus: {
    heading: "UNSER FOKUS",
    items: [
      {
        icon: "GraduationCap",
        title: "Fachlich & didaktisch hochwertige Ausbildung",
        href: "https://www.ephia.de/unsere-didaktik",
        ctaLabel: "Mehr erfahren",
      },
      {
        icon: "Heart",
        title: "Patient:innenzentrierte, inklusive Medizin",
        href: "https://www.ephia.de/unsere-vision",
        ctaLabel: "Mehr erfahren",
      },
      {
        icon: "Users",
        title: "Förderung unserer Ärzt:innen-Community",
        href: "https://www.ephia.de/community",
        ctaLabel: "Mehr erfahren",
      },
    ],
  },

  testimonials: {
    eyebrow: "Stimmen · Aus unserer Community",
    heading: "#wearetogether",
    subheading: "Was durch uns ausgebildete Ärzt:innen sagen",
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

  instagram: {
    eyebrow: "Folge uns · @ephia.academy auf Instagram",
    heading: "NEWSLETTER SIND VON GESTERN",
    subheading: "Folge uns einfach auf Insta!",
    widgetId: "6fbfcc53812a55ec9db620f1a9d278b6",
  },
};
