import type { CourseLandingContent } from "./types";

/**
 * Aufbaukurs Botulinum Therapeutische Indikationen landing page content.
 *
 * Content sourced from the live www.ephia.de/aufbaukurs-therapeutische-
 * botulinum-indikationen page.
 *
 * Prices, sessions, and availability are pulled dynamically from Supabase
 * via the booking widget (do NOT hardcode them here).
 */
export const aufbaukursTherapeutischeIndikationenBotulinum: CourseLandingContent = {
  slug: "aufbaukurs-therapeutische-indikationen-botulinum",
  courseKey: "aufbaukurs_therapeutische_indikationen_botulinum",

  meta: {
    title: "Aufbaukurs Botulinum Therapeutische Indikationen | EPHIA",
    description:
      "Aufbaukurs Botulinum für approbierte Ärzt:innen mit Fokus auf therapeutische Indikationen: Bruxismus, Masseterhypertrophie, Migräne, Hyperhidrose. Praxisnah, evidenzbasiert und mit 21 CME-Punkten akkreditiert.",
    ogImage: "/kurse/aufbaukurs_therapeutische_indikationen_botulinum/og-image.jpg",
  },

  hero: {
    heading: "AUFBAUKURS BOTULINUM THERAPEUTISCHE INDIKATIONEN",
    subheadline:
      "Erweitere Dein Behandlungsspektrum in den therapeutischen Botulinum-Indikationen, fundiert, evidenzbasiert und praxisnah.",
    stats: [
      { icon: "Clock", label: "Format", value: "Online- und als Praxiskurs" },
      { icon: "Award", label: "Akkreditiert", value: "21 CME-Punkte + Zertifikat" },
      { icon: "GraduationCap", label: "Level", value: "Aufbaukurs" },
    ],
    description:
      "Dieser Aufbaukurs richtet sich an approbierte Ärzt:innen mit Grunderfahrung in der Botulinum-Anwendung. Du vertiefst Dein Wissen in den wichtigsten therapeutischen Indikationen, also Bruxismus und Masseterhypertrophie, chronische Migräne sowie fokale Hyperhidrose, und lernst Anatomie, Indikationsstellung, Produktwahl, Technik, Patient:innenkommunikation und Komplikationsmanagement sicher umzusetzen.",
    videoPath: "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/aufbaukurs_therap_indik/Tina_Indikation_23022025_V.1-compressed.mp4",
    videoPoster: "/kurse/grundkurs_botulinum/hero-poster.jpg",
  },

  lernziele: {
    heading: "LERNZIELE",
    intro:
      "Nach dem Kurs kannst Du Deine Patient:innen sicher, fundiert und diskriminierungssensibel in den therapeutischen Botulinum-Indikationen behandeln. Dabei konzentrieren wir uns auf die folgenden Lernziele:",
    items: [
      {
        label: "Anatomie",
        icon: "BicepsFlexed",
        description:
          "Vertiefung der funktionellen Anatomie für therapeutische Indikationen: Masseter, Temporalis, perioraler Komplex, zervikale Muskulatur und Schweißdrüsenareale.",
      },
      {
        label: "Indikationen",
        icon: "ClipboardCheck",
        description:
          "Du lernst, Indikationen sicher zu stellen und Kontraindikationen zuverlässig zu erkennen, von Bruxismus und Masseterhypertrophie über Migräne bis hin zur fokalen Hyperhidrose.",
      },
      {
        label: "Produktkenntnis",
        icon: "Syringe",
        description:
          "Unterschiede der verfügbaren Botulinumtoxin-Präparate, ihre Dosierung für die therapeutischen Indikationen und sinnvolle Auswahlkriterien im Praxisalltag.",
      },
      {
        label: "Patient:innenkommunikation",
        icon: "MessageCircleHeart",
        description:
          "Du führst empathische, evidenzbasierte Beratungsgespräche, formulierst realistische Behandlungsziele und begleitest Deine Patient:innen strukturiert über mehrere Behandlungszyklen.",
      },
      {
        label: "Technik",
        icon: "Target",
        description:
          "Injektionstechniken für jede Indikation, inklusive Behandlungsvideos und klarer Schritt-für-Schritt-Anleitungen am Modell und an Patient:innen.",
      },
      {
        label: "Komplikationsmanagement",
        icon: "ShieldAlert",
        description:
          "Prävention, Erkennung und Management typischer Komplikationen, von Asymmetrien über unerwünschte Kau- und Mimikeffekte bis hin zu seltenen systemischen Reaktionen.",
      },
    ],
  },

  kursangeboteHeading: "UNSERE KURSANGEBOTE",

  gruppenbuchungen: {
    heading: "GRUPPENBUCHUNGEN",
    description:
      "Gerne erstellen wir auch maßgeschneiderte Angebote für Dich und Deine Kolleg:innen. Sende uns dazu einfach eine Anfrage mit folgendem Inhalt: Anzahl Teilnehmer:innen (min. 4 Personen), gewünschter Kursinhalt, gewünschter Zeitraum.",
    ctaLabel: "Jetzt Anfrage senden",
    ctaHref: "mailto:customerlove@ephia.de?subject=Gruppenbuchung%20Aufbaukurs%20Botulinum%20Therapeutische%20Indikationen",
  },

  inhalt: {
    heading: "INHALT ONLINEKURS",
    intro: "Der Onlinekurs ist im Komplettpaket Aufbaukurs Botulinum inkludiert.",
    chapters: [
      {
        number: 1,
        title: "Begrüßung",
        subsections: [
          {
            title: "Kurseinführung",
            description:
              "Was Dich erwartet, Überblick über Aufbau und Lernziele des Kurses.",
          },
          {
            title: "Unsere Community",
            description:
              "Lerne von und mit anderen approbierten Ärzt:innen, Zugang zu Fallbesprechungen, Austausch und Updates aus der Praxis.",
          },
          {
            title: "Kursüberblick",
            description: "Modulstruktur und praktische Nutzung.",
          },
        ],
      },
      {
        number: 2,
        title: "Bruxismus & Masseterhypertrophie",
        subsections: [
          {
            title: "Pathophysiologie",
            description:
              "Ursachen und Folgen chronischer Überaktivität der Kaumuskulatur, ästhetische vs. funktionelle Komponente.",
          },
          {
            title: "Diagnostik",
            description:
              "Klinische Befunderhebung, Anamnese, Abgrenzung gegenüber CMD und anderen Differentialdiagnosen.",
          },
          {
            title: "Therapie & Dosierung",
            description:
              "Behandlungsprotokoll für Masseter und Temporalis, empfohlene Dosen, Injektionspunkte und Intervalle.",
          },
          {
            title: "Nachsorge & Follow-up",
            description:
              "Realistische Ergebniserwartung, Kombination mit Schienentherapie, Langzeitführung der Patient:innen.",
          },
        ],
      },
      {
        number: 3,
        title: "Migräne",
        subsections: [
          {
            title: "Pathophysiologie chronischer Migräne",
            description:
              "Periphere und zentrale Komponenten der Migräne, Wirkmechanismus von Botulinumtoxin.",
          },
          {
            title: "PREEMPT-Protokoll",
            description:
              "Evidenzbasiertes Injektionsschema, 31 Injektionspunkte, Dosierung und anatomische Landmarken.",
          },
          {
            title: "Patient:innenauswahl",
            description:
              "Einschlusskriterien, typische Erwartungshaltung, interdisziplinäre Zusammenarbeit mit Neurolog:innen.",
          },
        ],
      },
      {
        number: 4,
        title: "Hyperhidrose",
        subsections: [
          {
            title: "Indikationen & Kontraindikationen",
            description:
              "Axilläre, palmare und plantare Hyperhidrose, Abklärung sekundärer Ursachen vor Therapiebeginn.",
          },
          {
            title: "Minor-Test & Anzeichnung",
            description:
              "Stärkejodtest zur Identifikation der Schwitzareale, präzises Anzeichnen des Injektionsrasters.",
          },
          {
            title: "Technik & Dosierung",
            description:
              "Injektionsschema, empfohlene Dosen pro Region, typische Behandlungsdauer und Wiederholungsintervalle.",
          },
          {
            title: "Nachsorge",
            description:
              "Verhaltensempfehlungen nach der Behandlung und realistische Erwartungen an die Wirkdauer.",
          },
        ],
      },
      {
        number: 5,
        title: "Muskuläre Verspannungen",
        subsections: [
          {
            title: "Zervikale Dystonien",
            description:
              "Klinisches Bild, häufigste betroffene Muskelgruppen, Therapieansätze mit Botulinum.",
          },
          {
            title: "Diagnostik",
            description:
              "Strukturierte Befunderhebung und Zusammenarbeit mit Neurologie und Physiotherapie.",
          },
          {
            title: "Therapieoptionen",
            description:
              "Injektionspunkte, Dosierung und Kombinationstherapie mit Physiotherapie und oralen Medikamenten.",
          },
        ],
      },
      {
        number: 6,
        title: "Myth Buster",
        subsections: [
          {
            title: "Populäre Missverständnisse",
            description:
              "Mythen rund um therapeutische Botulinum-Behandlungen und was die aktuelle Evidenz dazu sagt.",
          },
          {
            title: "Evidenzbasierte Entscheidungen",
            description:
              "Wie Du zwischen Marketing-Versprechen und fundierter Literatur unterscheidest.",
          },
        ],
      },
    ],
  },

  lernplattform: {
    heading: "AUFBAU UNSERER LERNPLATTFORM",
    features: [
      {
        title: "Einfache Navigation",
        description:
          "Unsere Plattform bietet Dir eine klare Struktur mit übersichtlicher Navigation zwischen Kapiteln und Unterkapiteln.",
        bullets: [
          "Fortschrittsanzeige zeigt Dir jederzeit, wie weit Du bist.",
          "Inhalte können jederzeit pausiert und wieder aufgenommen werden.",
          "Im Reiter „Austausch\" kannst Du Fragen stellen und Dich mit der Community und Dozierenden austauschen.",
        ],
        mediaPath: "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/grundkurs_dermalfiller/1.png",
      },
      {
        title: "Realitätsnahe Behandlungen",
        description:
          "Zu jeder im Kurs behandelten Indikation findest Du praxisnahe Videosequenzen:",
        bullets: [
          "Zuerst siehst Du die korrekte Anzeichnung der Injektionspunkte direkt am Modell,",
          "danach die Behandlungsschritte live an Patient:innen, fachlich kommentiert und anschaulich erklärt.",
          "So kannst Du den Ablauf sicher nachvollziehen und in Deinen Praxisalltag übertragen.",
        ],
        mediaPath: "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/grundkurs_botulinum/Grundkurs%20Botulinum_compressed.mp4",
      },
      {
        title: "Fachlich hochstehende Inhalte",
        description:
          "Alle Kursinhalte wurden von unseren erfahrenen Dozierenden entwickelt und durch unser unabhängiges Review-Board geprüft.",
        bullets: [
          "Evidenzbasierte Informationen, aktuelle Literatur und klinische Relevanz stehen im Mittelpunkt.",
          "Auch nach dem Kurs sind unsere Dozierenden in der Community für Fragen erreichbar.",
          "Für ein nachhaltiges Lernen, weit über das Kursende hinaus.",
        ],
        mediaPath: "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/grundkurs_dermalfiller/2.png",
      },
      {
        title: "Klare Lernziele & Tests",
        description:
          "Jedes Kapitel startet mit präzise formulierten Lernzielen, die Dir helfen, den Fokus zu setzen:",
        bullets: [
          "Die Lernziele sind abgestimmt auf die CME-Testfragen am Kapitelende.",
          "Alle Inhalte wurden so ausgewählt, dass sie direkt für Deine praktische Arbeit relevant sind.",
          "So lernst Du nicht einfach nur mit, sondern gezielt für Deine Patient:innen.",
        ],
        mediaPath: "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/grundkurs_dermalfiller/3.png",
      },
    ],
  },

  ctaBanner: {
    heading: "Bring Dein Fachwissen auf die nächste Stufe!",
    ctaLabel: "Zu den Angeboten",
    ctaHref: "#kursangebote",
  },

  testimonials: {
    heading: "PRAXISSTIMMEN",
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
        question: "Muss ich den Grundkurs Botulinum bereits absolviert haben?",
        answer:
          "Der Aufbaukurs richtet sich an approbierte Ärzt:innen mit Grunderfahrung in der Botulinum-Anwendung. Du solltest die Grundlagen der ästhetischen Botulinum-Behandlung, die relevante Anatomie und die wichtigsten Injektionstechniken bereits beherrschen. Wenn Du Dir unsicher bist, ob der Kurs für Dich geeignet ist, schreib uns gerne an customerlove@ephia.de.",
      },
      {
        question: "Muss ich eine Probandin / einen Probanden zum Praxis-Teil mitbringen?",
        answer:
          "Jede:r Kursteilnehmer:in darf eine:n eigene:n Proband:in zum Praxiskurs mitnehmen. Zusätzlich stellt EPHIA weitere Proband:innen zur Verfügung, um sicherzustellen, dass alle Teilnehmenden ausreichend praktische Erfahrung erhalten. Solltest Du keine eigene Proband:in mitbringen können, organisieren wir Dir gerne jemanden aus unserem Proband:innen-Pool.",
      },
      {
        question: "Kann ich direkt nach Abschluss des Kurses Patient:innen behandeln?",
        answer:
          "Um Behandlungssicherheit zu erlangen, empfehlen wir Dir den Online- und Praxiskurs zu belegen, bei dem Du ausreichend praktische Erfahrung unter Aufsicht sammeln kannst. Danach bist Du bereit, Deine eigenen Patient:innen kompetent und sicher in den therapeutischen Indikationen zu behandeln. Beachte dabei die rechtlichen und berufsrechtlichen Rahmenbedingungen in Deinem Land bzw. Deiner Region.",
      },
      {
        question: "Werden alle therapeutischen Indikationen als IGeL oder als Kassenleistung behandelt?",
        answer:
          "Das hängt von der Indikation und dem jeweiligen Versicherungskontext ab. Ästhetische Indikationen werden als IGeL-Leistung abgerechnet. Therapeutische Indikationen wie die chronische Migräne oder ausgeprägte fokale Hyperhidrose sind unter bestimmten Voraussetzungen erstattungsfähig. Im Kurs gehen wir auf die grundsätzlichen Unterschiede ein, die konkrete Abrechnungssituation solltest Du immer im Einzelfall mit der Kasse der Patient:innen klären.",
      },
    ],
  },
};
