import type { CourseLandingContent } from "./types";

/**
 * Aufbaukurs Botulinum Periorale Zone landing page content.
 *
 * Content sourced from the live www.ephia.de/aufbaukurs-botulinum-periorale-zone
 * page. Prices, sessions, and availability are pulled dynamically from
 * Supabase via the booking widget (do NOT hardcode them here).
 */
export const aufbaukursBotulinumPerioraleZone: CourseLandingContent = {
  slug: "aufbaukurs-botulinum-periorale-zone",
  courseKey: "aufbaukurs_botulinum_periorale_zone",

  meta: {
    title: "Aufbaukurs Botulinum Periorale Zone | EPHIA",
    description:
      "Aufbaukurs Botulinum für approbierte Ärzt:innen mit Fokus auf die periorale Zone: Lip Flip, Gummy Smile, Erdbeerkinn, Mundwinkel und Platysma. Praxisnah, evidenzbasiert und CME-akkreditiert.",
    ogImage: "/kurse/aufbaukurs_botulinum_periorale_zone/og-image.jpg",
  },

  hero: {
    heading: "AUFBAUKURS BOTULINUM PERIORALE ZONE",
    subheadline:
      "Vertiefe Deine Myomodulations-Skills für die sensible periorale Zone, fundiert, evidenzbasiert und praxisnah.",
    stats: [
      { icon: "Clock", label: "Format", value: "Online- und als Praxiskurs" },
      { icon: "Award", label: "Akkreditiert", value: "CME-Punkte + Zertifikat" },
      { icon: "GraduationCap", label: "Level", value: "Aufbaukurs" },
    ],
    description:
      "Dieser Aufbaukurs richtet sich an approbierte Ärzt:innen mit Grunderfahrung in der Botulinum-Anwendung. Du vertiefst Deine Behandlungssicherheit in der perioralen Zone, lernst die relevante Anatomie, Indikationen und Produktwahl, spezifische Injektionstechniken für Lip Flip, Gummy Smile, Mundwinkel, Erdbeerkinn und Platysma sowie diskriminierungssensible Patient:innenkommunikation und Komplikationsmanagement.",
    videoPath: "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/aufbaukurs_botulinum_periorale_zone/1.%20Intro_Periorale_Zone_V1-compressed.mp4",
    videoPoster: "/kurse/grundkurs_botulinum/hero-poster.jpg",
  },

  lernziele: {
    heading: "LERNZIELE",
    intro:
      "Nach dem Kurs kannst Du Deine Patient:innen sicher, fundiert und diskriminierungssensibel in der perioralen Zone behandeln. Dabei konzentrieren wir uns auf die folgenden Lernziele:",
    items: [
      {
        label: "Anatomie",
        icon: "BicepsFlexed",
        description:
          "Vertiefung der funktionellen Anatomie der perioralen Zone: Lippenmuskulatur, Mundwinkelmuskulatur, Mentalis, Platysma und zugehörige Gefäß- und Nervenstrukturen.",
      },
      {
        label: "Indikationen",
        icon: "ClipboardCheck",
        description:
          "Du lernst, Indikationen und Kontraindikationen zuverlässig zu beurteilen und Patient:innen mit unrealistischen Erwartungen sensibel aufzuklären.",
      },
      {
        label: "Produktkenntnis",
        icon: "Syringe",
        description:
          "Unterschiede der Botulinumtoxin-Präparate, ihre Dosierung für die periorale Zone und sinnvolle Auswahlkriterien im Praxisalltag.",
      },
      {
        label: "Patient:innenkommunikation",
        icon: "MessageCircleHeart",
        description:
          "Du führst empathische, evidenzbasierte Beratungsgespräche, formulierst realistische Behandlungsziele und begleitest Deine Patient:innen strukturiert durch die Behandlungsphasen.",
      },
      {
        label: "Technik",
        icon: "Target",
        description:
          "Spezifische Injektionstechniken für jede Indikation, inklusive Behandlungsvideos und klarer Schritt-für-Schritt-Anleitungen am Modell und an Patient:innen.",
      },
      {
        label: "Komplikationsmanagement",
        icon: "ShieldAlert",
        description:
          "Prävention, Erkennung und Management typischer Komplikationen der perioralen Zone, von Asymmetrien über Lähmungen der Mundwinkel bis hin zu Kau- und Sprechstörungen.",
      },
    ],
  },

  kursangeboteHeading: "UNSERE KURSANGEBOTE",

  gruppenbuchungen: {
    heading: "GRUPPENBUCHUNGEN",
    description:
      "Gerne erstellen wir auch maßgeschneiderte Angebote für Dich und Deine Kolleg:innen. Sende uns dazu einfach eine Anfrage mit folgendem Inhalt: Anzahl Teilnehmer:innen (min. 4 Personen), gewünschter Kursinhalt, gewünschter Zeitraum.",
    ctaLabel: "Jetzt Anfrage senden",
    ctaHref: "mailto:customerlove@ephia.de?subject=Gruppenbuchung%20Aufbaukurs%20Botulinum%20Periorale%20Zone",
  },

  inhalt: {
    heading: "KURSINHALT",
    chapters: [
      {
        number: 1,
        title: "Begrüßung & Kursüberblick",
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
        title: "Grundlagen",
        subsections: [
          {
            title: "Wiederholung der Anatomie",
            description:
              "Kurze Rekapitulation der relevanten Muskelanatomie als Basis für die nachfolgenden Behandlungsmodule.",
          },
          {
            title: "Voraussetzungen an Teilnehmer:innen",
            description:
              "Erwartete Vorerfahrung und Grundkenntnisse für den sicheren Einstieg in die periorale Zone.",
          },
          {
            title: "Ablauf Praxisunterricht",
            description:
              "Wie der Praxiskurs aufgebaut ist und welche Rolle die Behandlungsvideos im Online-Teil spielen.",
          },
        ],
      },
      {
        number: 3,
        title: "Schönheitsideale & Hintergründe",
        subsections: [
          {
            title: "Diskriminierung in der ästhetischen Medizin",
            description:
              "Rassistische, sozioökonomische und altersbezogene Ungleichheiten, fehlende Repräsentation in Forschung und Lehre.",
          },
          {
            title: "Vielfalt in der ästhetischen Medizin",
            description:
              "Unterschiede in Gesichtsanatomie je nach Geschlecht, Alter und Ethnie. Bedeutung kultureller Schönheitsideale für die Behandlungsplanung.",
          },
          {
            title: "Unrealistische Erwartungen",
            description:
              "Erkennen von übermäßigem oder fortlaufendem Behandlungswunsch und wie Du damit evidenzbasiert umgehst.",
          },
        ],
      },
      {
        number: 4,
        title: "Anatomie der perioralen Zone",
        subsections: [
          {
            title: "Muskulatur",
            description:
              "Orbicularis oris, Levatoren, Depressoren, Mentalis und Platysma als Funktionseinheit der perioralen Zone.",
          },
          {
            title: "Gefäße & Nerven",
            description:
              "Arterielle Versorgung, venöse Drainage und sensible Innervation der perioralen Region.",
          },
          {
            title: "Alterungsprozesse der perioralen Region",
            description:
              "Muskuläre, knöcherne und Weichgewebe-Veränderungen im Zusammenspiel und ihre Konsequenz für die Behandlungsplanung.",
          },
        ],
      },
      {
        number: 5,
        title: "Behandlung der Lippen mit Lip Flip",
        subsections: [
          {
            title: "Anatomie",
            description:
              "Zielmuskulatur und relevante Injektionspunkte für den Lip Flip, Abgrenzung zu Filler-Indikationen.",
          },
          {
            title: "Injektionspunkte & Dosierung",
            description:
              "Dosis pro Punkt, Punktplatzierung und Hinweise zur Anpassung je nach Anatomie.",
          },
          {
            title: "Behandlung am Modell",
            description:
              "Praktische Demonstration mit Anzeichnung und Schritt-für-Schritt-Injektion.",
          },
        ],
      },
      {
        number: 6,
        title: "Behandlung der Mundwinkel",
        subsections: [
          {
            title: "Anatomie",
            description:
              "Depressor anguli oris und Umgebung: sichere Injektionszonen und Risikobereiche.",
          },
          {
            title: "Injektionspunkte & Dosierung",
            description:
              "Empfohlene Dosen, Punktabstände und Kombination mit anderen Techniken.",
          },
          {
            title: "Behandlung am Modell",
            description:
              "Praktische Demonstration mit Anzeichnung und Injektion am Patient:innenbeispiel.",
          },
        ],
      },
      {
        number: 7,
        title: "Behandlung des Erdbeerkinns",
        subsections: [
          {
            title: "Anatomie",
            description:
              "Mentalis und umliegende Strukturen, Bezug zur knöchernen Basis.",
          },
          {
            title: "Injektionspunkte & Dosierung",
            description:
              "Dosierung und präzise Platzierung zur Glättung der Mentalis-Überaktivität.",
          },
          {
            title: "Behandlung am Modell",
            description:
              "Praktische Demonstration mit Anzeichnung und Schritt-für-Schritt-Injektion.",
          },
        ],
      },
      {
        number: 8,
        title: "Behandlung des Gummy Smiles",
        subsections: [
          {
            title: "Anatomie",
            description:
              "Levatoren des Oberlippenkomplexes und ihre Rolle beim Gummy Smile.",
          },
          {
            title: "Injektionspunkte & Dosierung",
            description:
              "Dosierung, Punktplatzierung und Abgrenzung zu Nachbarstrukturen zur Vermeidung von Asymmetrien.",
          },
          {
            title: "Behandlung am Modell",
            description:
              "Praktische Demonstration mit Anzeichnung und Schritt-für-Schritt-Injektion.",
          },
        ],
      },
      {
        number: 9,
        title: "Behandlung des Platysmas",
        subsections: [
          {
            title: "Anatomie",
            description:
              "Platysma als Mimik- und Halsmuskel, Bezug zur Mundwinkel- und Halsregion.",
          },
          {
            title: "Injektionspunkte & Dosierung",
            description:
              "Dosierung und Punktraster für die Entspannung der Platysma-Bänder (Nefertiti-Lift).",
          },
          {
            title: "Behandlung am Modell",
            description:
              "Praktische Demonstration mit Anzeichnung und Schritt-für-Schritt-Injektion.",
          },
        ],
      },
      {
        number: 10,
        title: "Myth Buster & Dispositionen & Fragen",
        subsections: [
          {
            title: "Populäre Missverständnisse",
            description:
              "Mythen rund um Botulinum-Behandlungen in der perioralen Zone und was die aktuelle Evidenz dazu sagt.",
          },
          {
            title: "Dispositionen & Sonderfälle",
            description:
              "Hinweise zu Sonderfällen, interdisziplinären Schnittstellen und Hilfestellungen für den Praxisalltag.",
          },
          {
            title: "Offene Fragen",
            description:
              "Raum für Fragen aus der Community und strukturierte Antworten unserer Dozierenden.",
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
        mediaPath: "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/aufbaukurs_botulinum_periorale_zone/1.png",
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
        mediaPath: "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/aufbaukurs_botulinum_periorale_zone/2.mp4",
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
        mediaPath: "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/aufbaukurs_botulinum_periorale_zone/3.png",
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
        mediaPath: "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/aufbaukurs_botulinum_periorale_zone/4.png",
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
          "Der Aufbaukurs Periorale Zone richtet sich an approbierte Ärzt:innen mit Grunderfahrung in der Botulinum-Anwendung. Du solltest die Grundlagen der ästhetischen Botulinum-Behandlung, die relevante Anatomie und die wichtigsten Injektionstechniken bereits beherrschen. Wenn Du Dir unsicher bist, ob der Kurs für Dich geeignet ist, schreib uns gerne an customerlove@ephia.de.",
      },
      {
        question: "Kann ich direkt nach Abschluss des Kurses Patient:innen in der perioralen Zone behandeln?",
        answer:
          "Um Behandlungssicherheit zu erlangen, empfehlen wir Dir den Online- und Praxiskurs zu belegen, bei dem Du ausreichend praktische Erfahrung unter Aufsicht sammeln kannst. Danach bist Du bereit, Deine eigenen Patient:innen kompetent und sicher in der perioralen Zone zu behandeln. Beachte dabei die rechtlichen und berufsrechtlichen Rahmenbedingungen in Deinem Land bzw. Deiner Region.",
      },
      {
        question: "Muss ich eine Probandin / einen Probanden zum Praxis-Teil mitbringen?",
        answer:
          "Jede:r Kursteilnehmer:in darf eine:n eigene:n Proband:in zum Praxiskurs mitnehmen. Zusätzlich stellt EPHIA weitere Proband:innen zur Verfügung, um sicherzustellen, dass alle Teilnehmenden ausreichend praktische Erfahrung erhalten. Solltest Du keine eigene Proband:in mitbringen können, organisieren wir Dir gerne jemanden aus unserem Proband:innen-Pool.",
      },
      {
        question: "Ist mein:e Proband:in für den Kurs geeignet?",
        answer:
          "Für den Aufbaukurs Periorale Zone sollte die zu behandelnde Zone nicht kürzlich mit Botulinum behandelt worden sein, damit eine gute Beurteilung der Ausgangssituation möglich ist. Je nach Dosierung und individueller Muskulatur kann die Wirkung unterschiedlich lange anhalten.",
      },
    ],
  },
};
