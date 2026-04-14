import type { CourseLandingContent } from "./types";

/**
 * Grundkurs Dermalfiller — landing page content.
 *
 * Content based on the live LW page (ephia.de/grundkurs-dermalfiller).
 * Prices, sessions, and availability are pulled dynamically from Supabase
 * via the booking widget — do NOT hardcode them here.
 */
export const grundkursDermalfiller: CourseLandingContent = {
  slug: "grundkurs-dermalfiller",
  courseKey: "grundkurs_dermalfiller",

  meta: {
    title: "Grundkurs Dermalfiller | EPHIA",
    description:
      "Grundkurs Dermalfiller für approbierte Ärzt:innen: Lerne die Anatomie des Alterns, Behandlungsmöglichkeiten für das Mittelgesicht und erste Schritte in die Gesichtskonturierung. 22 CME-Punkte, praxisnah und diskriminierungssensibel.",
    ogImage: "/kurse/grundkurs_dermalfiller/og-image.jpg",
  },

  hero: {
    heading: "GRUNDKURS DERMALFILLER",
    socialProof: "Über 300 zertifizierte Ärzt:innen",
    subheadline:
      "Dein sicherer Einstieg in die ästhetische Medizin: Praxisnah, fundiert und mit echten Proband:innen.",
    stats: [
      { icon: "Clock", label: "Format", value: "10h Online + 5h Präsenz" },
      { icon: "Award", label: "Akkreditiert", value: "22 CME-Punkte + Zertifikat" },
      { icon: "GraduationCap", label: "Level", value: "Einsteigerkurs" },
    ],
    description:
      "Lerne die Grundlagen der ästhetischen Dermalfiller-Anwendung mit unserem Online-, Praxis- oder Kombikurs, speziell für approbierte Ärzt:innen. Tauche in praxisnahe Inhalte ein, die Dir den Einstieg in die Behandlung von Patient:innen mit Dermalfillern erleichtern oder Dein Basiswissen auffrischen. Du lernst die Anatomie des Alterns, die Behandlungsmöglichkeiten für das Mittelgesicht und erste Schritte in die Gesichtskonturierung kennen.",
    videoPath: "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/grundkurs_dermalfiller/dermalfiller-hero-web.mp4",
    videoPoster: "/kurse/grundkurs_botulinum/hero-poster.jpg",
  },

  lernziele: {
    heading: "LERNZIELE",
    intro:
      "Nach dem Kurs kannst Du Deine ersten Patient:innen sicher, fundiert und diskriminierungssensibel mit Dermalfillern behandeln. Dabei konzentrieren wir uns auf die folgenden Lernziele:",
    items: [
      {
        label: "Anatomie",
        icon: "BicepsFlexed",
        description:
          "Dermalfiller interagieren mit den verschiedenen Gewebeschichten. Daher lernst Du bei uns wichtige anatomische Grundlagen und die Anatomie des Alterns.",
      },
      {
        label: "Indikationen",
        icon: "ClipboardCheck",
        description:
          "Wir vermitteln Dir Sicherheit in der Indikationsstellung, den Kontraindikationen und einer sensiblen Patient:innenberatung.",
      },
      {
        label: "Produktkenntnis",
        icon: "Syringe",
        description:
          "Im Kurs lernst Du verschiedene Filler-Präparate, ihre Zusammensetzung, Eigenschaften und wesentliche Unterschiede kennen.",
      },
      {
        label: "Patient:innenkommunikation",
        icon: "MessageCircleHeart",
        description:
          "Du lernst, diskriminierungssensibel zu kommunizieren, Optionen zu erklären und patient:innenzentriert zu handeln.",
      },
      {
        label: "Technik",
        icon: "Target",
        description:
          "Wir zeigen Dir verschiedene Injektionstechniken und lehren, Patient:innen ganzheitlich, verantwortungsvoll und individuell zu behandeln.",
      },
      {
        label: "Komplikationsmanagement",
        icon: "ShieldAlert",
        description:
          "Du erlernst Strategien für den Umgang mit Komplikationen, damit Du die Sicherheit Deiner Patient:innen gewährleisten kannst.",
      },
    ],
  },

  kursangeboteHeading: "UNSERE KURSANGEBOTE",

  gruppenbuchungen: {
    heading: "GRUPPENBUCHUNGEN",
    description:
      "Gerne erstellen wir auch maßgeschneiderte Angebote für Dich und Deine Kolleg:innen. Sende uns dazu einfach eine Anfrage mit folgendem Inhalt: Anzahl Teilnehmer:innen (min. 4 Personen), gewünschter Kursinhalt, gewünschter Zeitraum.",
    ctaLabel: "Jetzt Anfrage senden",
    ctaHref: "mailto:customerlove@ephia.de?subject=Gruppenbuchung%20Grundkurs%20Dermalfiller",
  },

  inhalt: {
    heading: "INHALT ONLINEKURS",
    intro: "Der Onlinekurs ist im Kombikurs inkludiert.",
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
        title: "Grundlagen Dermalfiller",
        subsections: [
          {
            title: "Was sind Dermalfiller?",
            description:
              "Überblick über Hyaluronsäure-basierte und andere Filler, Zusammensetzung, Vernetzung und Wirkweise im Gewebe.",
          },
          {
            title: "Filler-Präparate & Eigenschaften",
            description:
              "Unterschiede in Viskosität, Elastizität, Kohäsivität und Hebefähigkeit. Auswahlkriterien je nach Behandlungszone.",
          },
          {
            title: "Kontraindikationen & Risiken",
            description:
              "Absolute und relative Kontraindikationen, Wechselwirkungen, Notfallmanagement bei vaskulärer Okklusion.",
          },
        ],
      },
      {
        number: 3,
        title: "Anatomie des Gesichts",
        subsections: [
          {
            title: "Gewebeschichten & Kompartimente",
            description:
              "Aufbau der Gesichtsschichten: Haut, subkutanes Fett, SMAS, tiefe Fettkompartimente, Periost. Relevanz für sichere Injektionsebenen.",
          },
          {
            title: "Gefäß- und Nervenversorgung",
            description:
              "Oberflächliche und tiefe Gefäße, Danger Zones, relevante Nervenstrukturen und Risikoregionen.",
          },
          {
            title: "Alterungsprozesse des Gesichts",
            description:
              "Veränderungen in Haut, Fett, Knochen und Bändern. Volumenverlust als zentraler Alterungsmechanismus.",
          },
        ],
      },
      {
        number: 4,
        title: "Beratung & Aufklärung",
        subsections: [
          {
            title: "Indikation & Kontraindikation",
            description:
              "Volumenverlust als Hauptindikation, psychologische Faktoren, medizinische Kontraindikationen.",
          },
          {
            title: "Kommunikation & Gesprächsführung",
            description:
              "Empathische und patient:innenzentrierte Gesprächsführung, klare Informationen zu Wirkung, Grenzen und Haltbarkeit von Fillern.",
          },
          {
            title: "Realistische Zielsetzung",
            description:
              "Vermittlung erreichbarer Ergebnisse, Harmonie und Natürlichkeit als Leitprinzip.",
          },
        ],
      },
      {
        number: 5,
        title: "Schönheitsideale & Hintergründe",
        subsections: [
          {
            title: "Diskriminierung in der ästhetischen Medizin",
            description:
              "Rassistische, sozioökonomische und altersbezogene Ungleichheiten, fehlende Repräsentation in Forschung und Studien.",
          },
          {
            title: "Vielfalt in der ästhetischen Medizin",
            description:
              "Unterschiede in Gesichtsanatomie je nach Geschlecht, Alter und Ethnie. Bedeutung kultureller Schönheitsideale für die Behandlungsplanung.",
          },
          {
            title: "Unrealistische Erwartungen",
            description:
              "Wunschvorstellungen, die medizinisch nicht erreichbar sind. Erkennen von übermäßigem oder fortlaufendem Behandlungswunsch.",
          },
        ],
      },
      {
        number: 6,
        title: "Injektionstechniken & Behandlungsstrategien",
        subsections: [
          {
            title: "Kanüle vs. Nadel",
            description:
              "Vor- und Nachteile beider Instrumente, Auswahlkriterien je nach Zone und Technik.",
          },
          {
            title: "Injektionstechniken",
            description:
              "Bolus, lineare Retrograde, Fanning, Cross-Hatching und weitere Techniken. Wahl der richtigen Technik je nach Behandlungszone.",
          },
          {
            title: "Behandlungsplanung",
            description:
              "Systematische Analyse des Gesichts, Priorisierung der Behandlungszonen, Mengenplanung und Dokumentation.",
          },
        ],
      },
      {
        number: 7,
        title: "Komplikationen & Nebenwirkungen",
        subsections: [
          {
            title: "Häufige Nebenwirkungen",
            description:
              "Schwellungen, Rötungen, Hämatome, Asymmetrien. Prävention und Management.",
          },
          {
            title: "Schwere Komplikationen",
            description:
              "Vaskuläre Okklusion, Blindheit, Gewebenekrose. Erkennung, Sofortmaßnahmen und Einsatz von Hyaluronidase.",
          },
          {
            title: "Notfallprotokoll",
            description:
              "Schritt-für-Schritt-Anleitung für den Notfall, Praxisausstattung und Dokumentation.",
          },
        ],
      },
      {
        number: 8,
        title: "Behandlung der lateralen Wange",
        subsections: [
          {
            title: "Anatomie & Behandlungszone",
            description:
              "Relevante Strukturen der lateralen Wange, sichere Injektionsebenen und Gefäßversorgung.",
          },
          {
            title: "Technik & Dosierung",
            description:
              "Empfohlene Techniken, Produktauswahl und Mengenplanung für die laterale Wangenaugmentation.",
          },
          {
            title: "Anzeichnen & Injektion",
            description:
              "Praktische Demonstration am Beispiel von Patient:innen.",
          },
        ],
      },
      {
        number: 9,
        title: "Behandlung der medialen Wange",
        subsections: [
          {
            title: "Anatomie & Behandlungszone",
            description:
              "Relevante Strukturen der medialen Wange, Fettkompartimente und Danger Zones.",
          },
          {
            title: "Technik & Dosierung",
            description:
              "Empfohlene Techniken, Produktauswahl und Mengenplanung für die mediale Wangenaugmentation.",
          },
          {
            title: "Anzeichnen & Injektion",
            description:
              "Praktische Demonstration am Beispiel von Patient:innen.",
          },
        ],
      },
      {
        number: 10,
        title: "Behandlung des Kinns",
        subsections: [
          {
            title: "Anatomie & Behandlungszone",
            description:
              "Relevante Strukturen des Kinns, Knochenstruktur und Weichteilgewebe.",
          },
          {
            title: "Technik & Dosierung",
            description:
              "Empfohlene Techniken für Kinnaugmentation und -konturierung, Produktauswahl.",
          },
          {
            title: "Anzeichnen & Injektion",
            description:
              "Praktische Demonstration am Beispiel von Patient:innen.",
          },
        ],
      },
      {
        number: 11,
        title: "Behandlung der Nasolabialfalten",
        subsections: [
          {
            title: "Anatomie & Behandlungszone",
            description:
              "Relevante Strukturen im Bereich der Nasolabialfalte, Ursachen und individuelle Ausprägung.",
          },
          {
            title: "Technik & Dosierung",
            description:
              "Empfohlene Techniken, Produktauswahl und Mengenplanung. Direkte vs. indirekte Behandlung über Wangenaugmentation.",
          },
          {
            title: "Anzeichnen & Injektion",
            description:
              "Praktische Demonstration am Beispiel von Patient:innen.",
          },
        ],
      },
      {
        number: 12,
        title: "Anpassungen von Geschlechts- und Gesichtsspezifischen Merkmalen",
        subsections: [
          {
            title: "Geschlechtsspezifische Unterschiede",
            description:
              "Unterschiede in Gesichtsproportionen, Knochenstruktur und Weichteilgewebe zwischen verschiedenen Geschlechtern.",
          },
          {
            title: "Individuelle Behandlungsplanung",
            description:
              "Anpassung der Behandlungsstrategie an individuelle anatomische und ästhetische Gegebenheiten.",
          },
        ],
      },
      {
        number: 13,
        title: "Offizielle Dokumente",
        subsections: [
          {
            title: "Vorlagen für Rechnung & Honorarvereinbarung",
            description:
              "Inklusive Erläuterungen zur GOÄ-konformen Abrechnung, Preisgestaltung und Mehrwertsteuer.",
          },
          {
            title: "Patient:innen-Informationen",
            description:
              "Für Verhaltensempfehlungen vor und nach der Behandlung.",
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
          "Im Reiter \u201eAustausch\" kannst Du Fragen stellen und Dich mit der Community und Dozierenden austauschen.",
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
        mediaPath: "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/grundkurs_dermalfiller/my-movie-web.mp4",
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
          "Der Grundkurs Botulinum war der erste Kurs der Dr. Sophia Academy, den ich besucht habe und er hat mich sehr überzeugt! Besonders gut fand ich die praktischen Übungen an Proband:innen und die 1:1 Begleitung durch Dr. Sophia! Auch die Erklärung der MD-Codes fand ich sehr aufschlussreich. Ich fühle mich wirklich bestens vorbereitet, meine ersten Patient:innen zu behandeln. In meinen Augen ist der Kurs ein absolutes Muss für Mediziner:innen, die im ästhetischen Bereich tätig werden wollen.",
        name: "Dr. Laura Bergeest",
        title: "Ärztin in der Inneren Medizin",
        photoPath: "/kurse/grundkurs_botulinum/testimonials/testimonial-1.png",
      },
      {
        quote:
          "Ich liebe Sophias diversen und individuellen Ansatz an die ästhetische Medizin. Bei ihr steht der Mensch mit seinen ganz eigenen Vorstellungen und Wünschen im Zentrum der Behandlung, keine vorgefertigten \u201eSchemata\". Ihre Kurse waren eine perfekte Kombination aus Theorie und Praxis und sie wurden mit großer fachlicher Kompetenz und viel Herzblut kuratiert. Wir kamen im Rahmen der Kurse alle dazu, das soeben Erlernte auch praktisch anzuwenden. Aus den Kursen bin ich mit dem selbstbewussten Gefühl gegangen, meine neu erworbenen Kenntnisse in die Tat umsetzen zu können.",
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
        question:
          "Muss ich approbierte Ärztin / approbierter Arzt sein, um an den Kursen teilnehmen zu können?",
        answer:
          "Ja, unsere Kurse richten sich speziell an approbierte Ärztinnen und Ärzte. Dies stellt sicher, dass alle Teilnehmenden über die notwendige medizinische Grundlage verfügen, um die Inhalte der ästhetischen Medizin, insbesondere im Umgang mit Dermalfillern, sicher anwenden zu können. Unsere Weiterbildungsangebote sind darauf ausgelegt, Fachkräfte mit dem neuesten Wissen und praktischen Fähigkeiten auszustatten, um eine hochwertige Patient:innenversorgung zu gewährleisten.",
      },
      {
        question:
          "Muss ich eine Probandin / einen Probanden an den Praxis-Teil mitbringen?",
        answer:
          "Uns ist es wichtig, dass Du bereits in Deiner Ausbildung einen guten Kontakt zu Deinen Patient:innen aufbaust. Dafür ist uns neben Aufklärung und Behandlung auch die Nachsorge wichtig. Das geht in der Regel am einfachsten, wenn Du eigene Proband:innen zu den Kursen mitbringst. Jede:r Kursteilnehmer:in darf eine:n eigene:n Proband:in zum Kurs mitnehmen. Zusätzlich stellt EPHIA weitere Proband:innen zur Verfügung, um sicherzustellen, dass alle Teilnehmenden ausreichend praktische Erfahrung erhalten. Solltest Du keine eigene Probandin oder keinen eigenen Probanden zum Kurs mitbringen können, so ist das kein Problem. Wir organisieren Dir gerne jemanden aus unserem Proband:innen-Pool.",
      },
      {
        question:
          "Kann ich direkt nach Abschluss einer der Kurse bereits Patient:innen behandeln?",
        answer:
          "Um Behandlungssicherheit zu erlangen, empfehlen wir Dir einen Kombikurs zu belegen, bei dem Du ausreichend praktische Erfahrung unter Aufsicht sammeln kannst. Danach sind wir überzeugt, dass Du das Selbstbewusstsein haben wirst, Deine eigenen Patient:innen kompetent und sicher zu behandeln. Es ist allerdings wichtig, dass Du auch die rechtlichen Vorgaben und berufsrechtlichen Rahmenbedingungen in Deinem Land bzw. in Deiner Region beachtest.",
      },
      {
        question: "Ist mein:e Proband:in für den Kurs geeignet?",
        answer:
          "Grundsätzlich hängt die Eignung einer Proband:in immer davon ab, welche Zone zuletzt behandelt wurde. Für unsere Dermalfiller-Kurse ist es wichtig, dass die zu behandelnden Zonen nicht kürzlich mit Fillern behandelt wurden, damit eine gute Beurteilung der Ausgangssituation möglich ist. Je nach Volumen, behandelter Region und individueller Anatomie können Filler unterschiedlich lange im Gewebe verbleiben.",
      },
    ],
  },
};
