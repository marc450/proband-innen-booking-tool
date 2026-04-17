import type { CourseLandingContent } from "./types";

/**
 * Aufbaukurs Lippen — landing page content.
 *
 * Content derived from the existing www.ephia.de/aufbaukurs-lippen page.
 * CME accreditation is currently pending at the LÄK Berlin, so the hero
 * badge and modal note reflect that (not "zertifiziert").
 *
 * Prices, sessions, and availability are pulled dynamically from Supabase
 * via the booking widget — do NOT hardcode them here.
 *
 * TODO (content): replace placeholder video/poster/OG assets once the
 * Lippen-specific marketing media is uploaded to Supabase storage.
 */
export const aufbaukursLippen: CourseLandingContent = {
  slug: "aufbaukurs-lippen",
  courseKey: "aufbaukurs_lippen",

  meta: {
    title: "Aufbaukurs Lippen | EPHIA",
    description:
      "Aufbaukurs Lippen für approbierte Ärzt:innen: Vertiefe Deine Behandlungssicherheit in der perioralen Zone. Anatomie, Indikationen, Technik und Komplikationsmanagement, mit praxisnahen Behandlungsvideos. CME-Punkte bei der LÄK Berlin beantragt.",
    ogImage: "/kurse/aufbaukurs_lippen/og-image.jpg",
  },

  hero: {
    heading: "AUFBAUKURS LIPPEN",
    subheadline:
      "Vertiefe Deine Behandlungssicherheit in der perioralen Zone, fundiert, praxisnah und diskriminierungssensibel.",
    stats: [
      { icon: "Clock", label: "Format", value: "Online- und als Praxiskurs" },
      { icon: "Award", label: "Akkreditierung", value: "CME bei LÄK Berlin beantragt" },
      { icon: "GraduationCap", label: "Level", value: "Aufbaukurs" },
    ],
    description:
      "Der Aufbaukurs Lippen richtet sich an approbierte Ärzt:innen mit Grunderfahrung in der Dermalfiller-Anwendung. Er baut auf dem Grundkurs Dermalfiller auf und vertieft Deine Kenntnisse in Anatomie, Indikationen, Produktwahl und Technik der perioralen Zone, mit besonderem Fokus auf Patient:innenkommunikation und Komplikationsmanagement.",
    videoPath: "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/aufbaukurs_lippen/My%20Movie-compressed.mp4",
    videoPoster: "/kurse/grundkurs_botulinum/hero-poster.jpg",
  },

  lernziele: {
    heading: "LERNZIELE",
    intro:
      "Nach dem Kurs kannst Du Deine Patient:innen sicher, fundiert und diskriminierungssensibel im Bereich der Lippen und perioralen Zone behandeln. Dabei konzentrieren wir uns auf die folgenden Lernziele:",
    items: [
      {
        label: "Anatomie",
        icon: "BicepsFlexed",
        description:
          "Wir vertiefen Dein Wissen zur Anatomie der perioralen Zone, Muskulatur, Gefäße, Nerven und Hautschichten und deren Bedeutung für sichere Injektionen.",
      },
      {
        label: "Indikationen",
        icon: "ClipboardCheck",
        description:
          "Du lernst, Indikationen und Kontraindikationen zuverlässig zu beurteilen und unrealistische Erwartungen frühzeitig zu erkennen.",
      },
      {
        label: "Produktkenntnis",
        icon: "Syringe",
        description:
          "Im Kurs lernst Du die für die Lippen geeigneten Filler-Präparate, ihre Eigenschaften und Auswahlkriterien im direkten Vergleich kennen.",
      },
      {
        label: "Patient:innenkommunikation",
        icon: "MessageCircleHeart",
        description:
          "Du führst aufklärende, diskriminierungssensible Gespräche, formulierst realistische Ziele und handelst patient:innenzentriert.",
      },
      {
        label: "Technik",
        icon: "Target",
        description:
          "Wir zeigen Dir spezifische Injektionstechniken für die Lippen und die periorale Zone, inklusive Behandlungsvideos und klarer Schritt-für-Schritt-Anleitungen.",
      },
      {
        label: "Komplikationsmanagement",
        icon: "ShieldAlert",
        description:
          "Du erlernst Strategien zur Prävention und zum Umgang mit Komplikationen, damit Du die Sicherheit Deiner Patient:innen jederzeit gewährleisten kannst.",
      },
    ],
  },

  kursangeboteHeading: "UNSERE KURSANGEBOTE",

  gruppenbuchungen: {
    heading: "GRUPPENBUCHUNGEN",
    description:
      "Gerne erstellen wir auch maßgeschneiderte Angebote für Dich und Deine Kolleg:innen. Sende uns dazu einfach eine Anfrage mit folgendem Inhalt: Anzahl Teilnehmer:innen (min. 4 Personen), gewünschter Kursinhalt, gewünschter Zeitraum.",
    ctaLabel: "Jetzt Anfrage senden",
    ctaHref: "mailto:customerlove@ephia.de?subject=Gruppenbuchung%20Aufbaukurs%20Lippen",
  },

  inhalt: {
    heading: "INHALT ONLINEKURS",
    intro: "Der Onlinekurs ist im Komplettpaket Dermalfiller inkludiert.",
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
        title: "Anatomie der perioralen Zone",
        subsections: [
          {
            title: "Muskulatur",
            description:
              "Funktionelle Anatomie der mimischen Muskulatur im perioralen Bereich und ihre Relevanz für die Behandlungsplanung.",
          },
          {
            title: "Gefäße & Nerven",
            description:
              "Arterielle Versorgung, venöse Drainage und sensible Innervation, inklusive Danger Zones.",
          },
          {
            title: "Übergänge & Hautschichten",
            description:
              "Lippenrot, Vermillion Border, Philtrum und umliegende Hautschichten, relevante Injektionsebenen im Detail.",
          },
        ],
      },
      {
        number: 3,
        title: "Indikationen & Wirkstoffe",
        subsections: [
          {
            title: "Indikationsstellung",
            description:
              "Typische ästhetische und funktionelle Indikationen sowie Grenzfälle, die eine individuelle Beurteilung erfordern.",
          },
          {
            title: "Kontraindikationen",
            description:
              "Absolute und relative Kontraindikationen, Wechselwirkungen und Vorsichtsmaßnahmen.",
          },
          {
            title: "Produktwahl",
            description:
              "Kriterien für die Auswahl der richtigen Filler für die Lippen, Unterschiede in Viskosität, Elastizität und Haltbarkeit.",
          },
        ],
      },
      {
        number: 4,
        title: "Beratung & Aufklärung",
        subsections: [
          {
            title: "Patient:innenkommunikation",
            description:
              "Empathische und diskriminierungssensible Gesprächsführung, klare Kommunikation von Wirkung, Grenzen und Haltbarkeit.",
          },
          {
            title: "Realistische Zielsetzung",
            description:
              "Entwicklung realistischer, harmonischer Behandlungsziele, die Anatomie und individuelle Wünsche berücksichtigen.",
          },
          {
            title: "Aufklärung & Einwilligung",
            description:
              "Rechtssichere Aufklärung, Dokumentation und Einwilligung vor der Behandlung.",
          },
        ],
      },
      {
        number: 5,
        title: "Komplikation & Nachsorge",
        subsections: [
          {
            title: "Häufige Nebenwirkungen",
            description:
              "Schwellungen, Hämatome, Asymmetrien, Knötchen. Prävention, Erkennung und Management.",
          },
          {
            title: "Schwere Komplikationen",
            description:
              "Vaskuläre Okklusion, Nekrose, Infektion, Granulome. Notfallprotokoll und Einsatz von Hyaluronidase.",
          },
          {
            title: "Nachsorge",
            description:
              "Empfehlungen für Deine Patient:innen nach der Behandlung und strukturierte Follow-ups.",
          },
        ],
      },
      {
        number: 6,
        title: "Myth Buster",
        subsections: [
          {
            title: "Häufige Missverständnisse",
            description:
              "Populäre Mythen rund um Lippenbehandlungen und was die aktuelle Evidenz dazu sagt.",
          },
          {
            title: "Evidenzbasierte Entscheidungen",
            description:
              "Wie Du zwischen Marketing-Versprechen und fundierter Literatur unterscheidest.",
          },
        ],
      },
      {
        number: 7,
        title: "Behandlungstechniken",
        subsections: [
          {
            title: "Kanüle vs. Nadel",
            description:
              "Vor- und Nachteile beider Instrumente in der perioralen Zone, Auswahlkriterien je nach Technik und Zone.",
          },
          {
            title: "Injektionstechniken",
            description:
              "Lineare Retrograde, Mikrobolus, Tenting und weitere Techniken für ein natürliches, harmonisches Ergebnis.",
          },
          {
            title: "Anzeichnen & Schritt-für-Schritt",
            description:
              "Praktische Demonstration am Modell und an Patient:innen, inklusive Anzeichnungen und detaillierter Schritt-für-Schritt-Anleitungen.",
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
        mediaPath: "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/aufbaukurs_lippen/1.png",
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
        mediaPath: "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/aufbaukurs_lippen/My%20Movie-compressed.mp4",
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
        mediaPath: "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/aufbaukurs_lippen/3.png",
      },
      {
        title: "Klare Lernziele & Tests",
        description:
          "Jedes Kapitel startet mit präzise formulierten Lernzielen, die Dir helfen, den Fokus zu setzen:",
        bullets: [
          "Die Lernziele sind abgestimmt auf die Testfragen am Kapitelende.",
          "Alle Inhalte wurden so ausgewählt, dass sie direkt für Deine praktische Arbeit relevant sind.",
          "So lernst Du nicht einfach nur mit, sondern gezielt für Deine Patient:innen.",
        ],
        mediaPath: "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/aufbaukurs_lippen/4.png",
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
          "Der Grundkurs Botulinum war der erste Kurs der Dr. Sophia Academy, den ich besucht habe und er hat mich sehr überzeugt! Besonders gut fand ich die praktischen Übungen an Proband:innen und die 1:1 Begleitung durch Dr. Sophia! Auch die Erklärung der MD-Codes fand ich sehr aufschlussreich. Ich fühle mich wirklich bestens vorbereitet, meine ersten Patient:innen zu behandeln. In meinen Augen ist der Kurs ein absolutes Muss für Mediziner:innen, die im ästhetischen Bereich tätig werden wollen.",
        name: "Dr. Laura Bergeest",
        title: "Ärztin in der Inneren Medizin",
        photoPath: "/kurse/grundkurs_botulinum/testimonials/testimonial-1.png",
      },
      {
        quote:
          "Ich liebe Sophias diversen und individuellen Ansatz an die ästhetische Medizin. Bei ihr steht der Mensch mit seinen ganz eigenen Vorstellungen und Wünschen im Zentrum der Behandlung, keine vorgefertigten „Schemata\". Ihre Kurse waren eine perfekte Kombination aus Theorie und Praxis und sie wurden mit großer fachlicher Kompetenz und viel Herzblut kuratiert. Wir kamen im Rahmen der Kurse alle dazu, das soeben Erlernte auch praktisch anzuwenden. Aus den Kursen bin ich mit dem selbstbewussten Gefühl gegangen, meine neu erworbenen Kenntnisse in die Tat umsetzen zu können.",
        name: "Nadja Geuther",
        title: "Ärztin in der Dermatologie",
        photoPath: "/kurse/grundkurs_botulinum/testimonials/testimonial-2.jpg",
      },
      {
        quote:
          "Sophias Kurs war sehr aufschlussreich für mich. Die detaillierte Erklärung der anatomischen Grundlagen und die praktischen Übungen haben meine Fähigkeiten deutlich verbessert. Besonders hilfreich fand ich die persönliche Betreuung und das Feedback während der Hands-on-Trainingseinheiten. Der Kurs hat mir das Vertrauen gegeben, meine neuen Fähigkeiten in der Praxis anzuwenden. Ich habe selten einen Kurs erlebt, der so gut strukturiert und praxisorientiert war.",
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
        question: "Muss ich den Grundkurs Dermalfiller bereits absolviert haben?",
        answer:
          "Der Aufbaukurs Lippen baut auf dem Grundkurs Dermalfiller auf. Du solltest die Grundlagen der Dermalfiller-Anwendung, die Anatomie des Gesichts und die wichtigsten Injektionstechniken bereits beherrschen. Wenn Du Dir unsicher bist, ob der Kurs für Dich geeignet ist, schreib uns gerne an customerlove@ephia.de.",
      },
      {
        question: "Sind die CME-Punkte schon akkreditiert?",
        answer:
          "Die CME-Punkte für diesen Kurs sind aktuell bei der LÄK Berlin beantragt. Sobald die Zertifizierung abgeschlossen ist, werden die Punkte allen Teilnehmer:innen rückwirkend gutgeschrieben. Das EPHIA-Zertifikat erhältst Du unabhängig davon direkt nach Abschluss des Kurses.",
      },
      {
        question: "Muss ich eine Probandin / einen Probanden zum Praxis-Teil mitbringen?",
        answer:
          "Jede:r Kursteilnehmer:in darf eine:n eigene:n Proband:in zum Praxiskurs mitnehmen. Zusätzlich stellt EPHIA weitere Proband:innen zur Verfügung, um sicherzustellen, dass alle Teilnehmenden ausreichend praktische Erfahrung erhalten. Solltest Du keine eigene Proband:in mitbringen können, organisieren wir Dir gerne jemanden aus unserem Proband:innen-Pool.",
      },
      {
        question: "Ist mein:e Proband:in für den Kurs geeignet?",
        answer:
          "Für den Aufbaukurs Lippen sollte die zu behandelnde Zone nicht kürzlich mit Fillern behandelt worden sein, damit eine gute Beurteilung der Ausgangssituation möglich ist. Je nach Volumen, behandelter Region und individueller Anatomie können Filler unterschiedlich lange im Gewebe verbleiben.",
      },
    ],
  },
};
