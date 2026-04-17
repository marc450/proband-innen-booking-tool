import type { CourseLandingContent } from "./types";

/**
 * Grundkurs Medizinische Hautpflege — landing page content.
 *
 * Pure-online course for all medical professions (Ärzt:innen and
 * Zahnärzt:innen). No Praxiskurs, no Komplettpaket — only the
 * Onlinekurs card is rendered on this page (the booking widget reads
 * price_gross_online / features_online from course_templates).
 *
 * Prices, sessions, and availability are pulled dynamically from Supabase
 * via the booking widget — do NOT hardcode them here.
 */
export const grundkursMedizinischeHautpflege: CourseLandingContent = {
  slug: "grundkurs-medizinische-hautpflege",
  courseKey: "grundkurs_medizinische_hautpflege",
  // Pure-online course — skip the 3-card booking widget. The hero CTA
  // and the mid-page CTA banner both start Stripe checkout directly.
  hideBookingWidget: true,

  meta: {
    title: "Grundkurs Medizinische Hautpflege | EPHIA",
    description:
      "Grundkurs Medizinische Hautpflege für approbierte Ärzt:innen: Grundlagen der Dermatologie, Hautphysiologie, Skin of Color, Behandlung von Akne, Rosazea und perioraler Dermatitis, Aufbau einer nachhaltigen Pflegeroutine, CME-zertifiziert.",
    ogImage: "/kurse/grundkurs_medizinische_hautpflege/og-image.jpg",
  },

  hero: {
    heading: "GRUNDKURS MEDIZINISCHE HAUTPFLEGE",
    subheadline:
      "Dein fundierter Einstieg in die Dermatologie und die medizinische Hautpflege, praxisnah, evidenzbasiert und patient:innenzentriert.",
    stats: [
      { icon: "Clock", label: "Format", value: "4h Online" },
      { icon: "Award", label: "Akkreditiert", value: "7 CME-Punkte + Zertifikat" },
      { icon: "GraduationCap", label: "Level", value: "Einsteigerkurs" },
    ],
    description:
      "Dieser Onlinekurs richtet sich an approbierte Ärzt:innen aller Fachrichtungen, die ihr Wissen rund um medizinische Hautpflege vertiefen möchten. Du lernst die wichtigsten Hautzustände wie Akne, Rosazea und periorale Dermatitis sicher zu erkennen und zu behandeln und erhältst einen klaren Rahmen für eine nachhaltige, patient:innenorientierte Pflegeroutine.",
    videoPath: "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/grundkurs_med_hautpflege/1_Sarah_Vorstellung_V1.1-compressed.mp4",
    videoPoster: "/kurse/grundkurs_botulinum/hero-poster.jpg",
    // Hautpflege is online-only — skip the booking widget on the page
    // and wire the hero CTA straight to Stripe checkout instead.
    ctaOverride: {
      label: "Jetzt buchen",
      directCheckoutCourseKey: "grundkurs_medizinische_hautpflege",
    },
  },

  lernziele: {
    heading: "LERNZIELE",
    // Audience is broader than the Dermalfiller/Botulinum courses so
    // override the default "Nur für approbierte Ärzt:innen" badge.
    audienceLabel: "Für alle medizinischen Fachrichtungen",
    intro:
      "Nach dem Kurs kannst Du Deine Patient:innen fundiert, evidenzbasiert und diskriminierungssensibel zur medizinischen Hautpflege beraten und behandeln. Dabei konzentrieren wir uns auf die folgenden Lernziele:",
    items: [
      {
        label: "Hautphysiologie",
        icon: "Layers",
        description:
          "Du lernst den Aufbau der Haut, ihre Schichten und Funktionen kennen, die Basis für alle weiteren Inhalte und Behandlungsentscheidungen.",
      },
      {
        label: "Skin of Color",
        icon: "Palette",
        description:
          "Du erkennst anatomische und physiologische Unterschiede verschiedener Hauttypen und kannst Deine Beratung und Therapie entsprechend anpassen.",
      },
      {
        label: "Störungen",
        icon: "AlertCircle",
        description:
          "Du lernst die wichtigsten Hautzustände wie Akne, Rosazea und periorale Dermatitis sicher zu erkennen und differenzieren zu können.",
      },
      {
        label: "Wirkstoffe",
        icon: "FlaskConical",
        description:
          "Du kennst die wichtigsten Wirkstoffe der medizinischen Hautpflege, ihre Indikationen, Wirkmechanismen und sinnvollen Kombinationen.",
      },
      {
        label: "Behandlungsoptionen",
        icon: "Sparkles",
        description:
          "Du lernst, welche Behandlungsoptionen bei welchem Hautbild sinnvoll sind und wie Du sie in eine nachhaltige Pflegeroutine integrierst.",
      },
      {
        label: "Patient:innenkonsultation",
        icon: "MessageCircleHeart",
        description:
          "Du führst strukturierte, empathische Beratungsgespräche, formulierst realistische Ziele und unterstützt Deine Patient:innen bei der langfristigen Routine.",
      },
    ],
  },

  kursangeboteHeading: "UNSERE KURSANGEBOTE",

  gruppenbuchungen: {
    heading: "GRUPPENBUCHUNGEN",
    description:
      "Gerne erstellen wir auch maßgeschneiderte Angebote für Dich und Deine Kolleg:innen. Sende uns dazu einfach eine Anfrage mit folgendem Inhalt: Anzahl Teilnehmer:innen (min. 4 Personen), gewünschter Kursinhalt, gewünschter Zeitraum.",
    ctaLabel: "Jetzt Anfrage senden",
    ctaHref: "mailto:customerlove@ephia.de?subject=Gruppenbuchung%20Grundkurs%20Medizinische%20Hautpflege",
  },

  inhalt: {
    heading: "KURSINHALT",
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
        title: "Grundlagen zur Haut",
        subsections: [
          {
            title: "Aufbau & Funktion der Haut",
            description:
              "Epidermis, Dermis, Subkutis und ihre Aufgaben. Talg, Schweiß und Hautflora als zentrale Schutzsysteme.",
          },
          {
            title: "Hautbarriere",
            description:
              "Zusammenspiel aus Lipiden, Korneozyten und Mikrobiom. Ursachen und Folgen einer gestörten Hautbarriere.",
          },
          {
            title: "pH-Wert & Hydratation",
            description:
              "Warum der physiologische pH-Wert und die Feuchtigkeitsversorgung entscheidend für gesunde Haut sind.",
          },
        ],
      },
      {
        number: 3,
        title: "Skin of Color",
        subsections: [
          {
            title: "Anatomische & physiologische Besonderheiten",
            description:
              "Unterschiede in Melaninverteilung, Hautbarriere, Narbenbildung und Reaktion auf Entzündung.",
          },
          {
            title: "Häufige Fehldiagnosen",
            description:
              "Wie Rötungen, Rosazea und andere Zeichen sich auf stärker pigmentierter Haut präsentieren und was das für Deine Diagnostik bedeutet.",
          },
          {
            title: "Angepasste Behandlung",
            description:
              "Produkt- und Verfahrensauswahl mit Blick auf Hyperpigmentierung, Irritation und Narbenrisiko.",
          },
        ],
      },
      {
        number: 4,
        title: "Akne",
        subsections: [
          {
            title: "Pathogenese & Formen",
            description:
              "Komedogenese, Entzündungsmechanismen, hormonelle und genetische Einflüsse. Differenzierung verschiedener Akneformen.",
          },
          {
            title: "Diagnostik",
            description:
              "Klinische Kriterien zur Einordnung der Schwere und zur Abgrenzung gegen andere Hauterkrankungen.",
          },
          {
            title: "Therapieoptionen",
            description:
              "Topische und systemische Optionen, Wirkstoffklassen, Kombinationsschemata und Leitlinienempfehlungen.",
          },
          {
            title: "Beratung",
            description:
              "Realistische Erwartungsmanagement, Adhärenz und psychosoziale Komponenten der Akneversorgung.",
          },
        ],
      },
      {
        number: 5,
        title: "Rosazea",
        subsections: [
          {
            title: "Pathogenese & Formen",
            description:
              "Gefäß-, Haut- und Immunkomponente der Rosazea. Klinische Subtypen im Überblick.",
          },
          {
            title: "Diagnostik",
            description:
              "Klinische Diagnosekriterien, Abgrenzung zu Akne und perioraler Dermatitis.",
          },
          {
            title: "Trigger",
            description:
              "Typische Auslöser: Temperatur, Ernährung, Alkohol, UV-Strahlung, Stress, Kosmetik.",
          },
          {
            title: "Therapieoptionen",
            description:
              "Topische und systemische Therapieoptionen, Laserverfahren und flankierende Pflegeempfehlungen.",
          },
          {
            title: "Beratung",
            description:
              "Langfristige Begleitung, Lebensstilmodifikation und realistische Zielsetzung.",
          },
        ],
      },
      {
        number: 6,
        title: "Periorale Dermatitis",
        subsections: [
          {
            title: "Pathogenese & Trigger",
            description:
              "Zusammenhang mit Überpflege, topischen Steroiden und Hautbarrierestörung.",
          },
          {
            title: "Diagnostik",
            description:
              "Typische Klinik, Abgrenzung zu Akne und Rosazea.",
          },
          {
            title: "Therapieoptionen",
            description:
              "Zero-Therapy, topische und systemische Ansätze, Dauer und Reevaluation.",
          },
          {
            title: "Prävention",
            description:
              "Aufklärung zu Überpflege und sinnvolle Minimalpflege.",
          },
        ],
      },
      {
        number: 7,
        title: "Hautalterung",
        subsections: [
          {
            title: "Intrinsische & extrinsische Alterung",
            description:
              "Genetische, hormonelle und umweltbedingte Faktoren. Rolle von UV, Rauch, Pollution und Schlaf.",
          },
          {
            title: "Klinische Zeichen",
            description:
              "Volumenverlust, Faltenbildung, Pigmentverschiebungen, Elastizitätsverlust.",
          },
          {
            title: "Therapieoptionen",
            description:
              "Anti-Aging-Wirkstoffe, Sonnenschutz und ergänzende ästhetische Verfahren.",
          },
          {
            title: "Prävention",
            description:
              "Langfristige Pflegeroutinen und Lebensstilaspekte, die nachweislich wirksam sind.",
          },
        ],
      },
      {
        number: 8,
        title: "Aufbau einer Pflegeroutine",
        subsections: [
          {
            title: "Reinigung",
            description:
              "Produkttypen, pH-Wert, Frequenz. Was Deine Patient:innen vermeiden sollten.",
          },
          {
            title: "Wirkstoffpflege",
            description:
              "Retinoide, Vitamin C, Niacinamid, Hyaluronsäure, Peptide: Wann, wie und in welcher Kombination.",
          },
          {
            title: "Feuchtigkeit",
            description:
              "Texturen, Konsistenzen und Schichtreihenfolge je nach Hauttyp.",
          },
          {
            title: "Sonnenschutz",
            description:
              "Breitband-UV-Schutz, SPF-Empfehlungen, mineralisch vs. chemisch, Integration in den Alltag.",
          },
        ],
      },
      {
        number: 9,
        title: "Myth Buster",
        subsections: [
          {
            title: "Populäre Missverständnisse",
            description:
              "Mythen rund um Hautpflege, Social-Media-Trends und Marketing-Versprechen, kritisch eingeordnet.",
          },
          {
            title: "Evidenzbasierte Entscheidungen",
            description:
              "Wie Du Deinen Patient:innen helfen kannst, zwischen Wissenschaft und Hype zu unterscheiden.",
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

  // Mid-page CTA banner. Online-only course, so both the hero and this
  // banner's CTAs trigger Stripe checkout directly.
  ctaBanner: {
    heading: "Bring Dein Fachwissen auf die nächste Stufe!",
    ctaLabel: "Jetzt buchen",
    ctaHref: "#",
    directCheckoutCourseKey: "grundkurs_medizinische_hautpflege",
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
        question: "Muss ich approbierte Ärztin / approbierter Arzt sein, um an diesem Kurs teilnehmen zu können?",
        answer:
          "Unsere Kurse richten sich an medizinische Fachpersonen. Für den Grundkurs Medizinische Hautpflege begrüßen wir Ärzt:innen, Zahnärzt:innen und alle weiteren approbierten medizinischen Fachrichtungen, die ihre Kompetenz in der Hautpflege vertiefen möchten. Eine abgeschlossene oder laufende medizinische Ausbildung setzen wir voraus.",
      },
      {
        question: "Kann ich direkt nach Abschluss des Kurses meine Patient:innen zur Hautpflege beraten?",
        answer:
          "Ja, der Kurs ist so aufgebaut, dass Du die Inhalte direkt in Deinen Praxisalltag übernehmen kannst. Du bekommst praxisnahe Entscheidungshilfen, strukturierte Routinen und evidenzbasierte Empfehlungen, die Du in Deiner Beratung und Behandlung sicher anwenden kannst. Wie immer gilt: Beachte die berufsrechtlichen Rahmenbedingungen in Deinem Land bzw. Deiner Region.",
      },
      {
        question: "Gibt es CME-Punkte für diesen Kurs?",
        answer:
          "Ja. Der Kurs ist bei der LÄK akkreditiert und es werden 7 CME-Punkte vergeben. Das EPHIA-Zertifikat erhältst Du direkt nach Abschluss der Lernkontrollen.",
      },
      {
        question: "Wie lange habe ich Zugriff auf die Inhalte?",
        answer:
          "Du hast 1,5 Jahre Zugriff auf alle Kursinhalte, inklusive aller Updates. Inhalte können jederzeit pausiert und wieder aufgenommen werden, damit Du in Deinem Tempo lernen kannst.",
      },
    ],
  },
};
