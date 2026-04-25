import type { CourseLandingContent } from "./types";
import { grundkursBotulinum } from "./grundkurs-botulinum";

/**
 * Botox-Kurs in Berlin — SEO-targeted city landing page.
 *
 * Targets the search term "Botox Kurs Berlin" and variants ("Botox
 * Fortbildung Berlin", "Botox Schulung Berlin", etc.). Re-uses the
 * Grundkurs Botulinum template (same Supabase courseKey, same
 * sessions, same chapter structure) but ships ~30-40% Berlin-specific
 * copy on top so we don't trip Google's near-duplicate filter:
 *   - Hero, description, lernziele intro: Berlin-flavoured
 *   - LocationInfo: HY STUDIO venue + transit + "Warum Berlin"
 *   - CurriculumCallout: links to Curriculum Botulinum
 *   - FAQ: prepended with Berlin-specific Q&A
 *
 * Inhalt / Lernplattform / Testimonials are inherited verbatim because
 * the course IS the same physical course; differentiation comes from
 * the unique copy above.
 */
export const botoxKursBerlin: CourseLandingContent = {
  slug: "botox-kurs-berlin",
  // Same Supabase template as Grundkurs Botulinum — booking widget
  // pulls real Berlin sessions automatically.
  courseKey: "grundkurs_botulinum",

  meta: {
    title: "Botox-Kurs in Berlin für Ärzt:innen | EPHIA",
    description:
      "Botox-Kurs in Berlin für approbierte Ärzt:innen: Praxistraining im HY STUDIO Berlin-Mitte, Behandlung echter Proband:innen, 22 CME-Punkte. Online- + Präsenztermine in Berlin verfügbar.",
    ogImage: "/kurse/grundkurs_botulinum/og-image.jpg",
  },

  hero: {
    heading: "BOTOX-KURS IN BERLIN",
    socialProof: "Über 300 zertifizierte Ärzt:innen",
    subheadline:
      "Praxisnahe Botox-Fortbildung für approbierte Ärzt:innen, mitten in Berlin-Mitte.",
    stats: [
      { icon: "MapPin", label: "Standort", value: "HY STUDIO Berlin-Mitte" },
      { icon: "Award", label: "Akkreditiert", value: "22 CME-Punkte + Zertifikat" },
      { icon: "GraduationCap", label: "Level", value: "Einsteigerkurs" },
    ],
    description:
      "Unser Botox-Kurs in Berlin ist Dein praxisnaher Einstieg in die ästhetische Medizin mit Botulinumtoxin. Du lernst Anatomie, Indikationen und Injektionstechnik im Online-Modul, behandelst anschließend echte Proband:innen unter Aufsicht im HY STUDIO an der Rosa-Luxemburg-Straße und gehst mit 22 CME-Punkten und EPHIA Zertifikat nach Hause. Der Kurs richtet sich ausschließlich an approbierte Ärzt:innen und Zahnmediziner:innen.",
    videoPath: grundkursBotulinum.hero.videoPath,
    videoPoster: grundkursBotulinum.hero.videoPoster,
  },

  curriculumLink: {
    pill: "Curriculum Botulinum",
    heading: "Teil unseres Curriculum Botulinum",
    description:
      "Dieser Botox-Kurs in Berlin ist der Einstieg in unser strukturiertes Botulinum-Curriculum: vom Grundkurs über Aufbaukurse bis zur Masterclass und der EPHIA Botulinum Specialist Zertifizierung.",
    ctaLabel: "Curriculum entdecken",
    ctaHref: "/kurse/curriculum-botulinum",
  },

  lernziele: {
    heading: "LERNZIELE",
    intro:
      "Nach unserem Botox-Kurs in Berlin kannst Du Deine ersten Patient:innen sicher, fundiert und diskriminierungssensibel mit Botulinumtoxin behandeln. Im Fokus stehen folgende Lernziele:",
    items: grundkursBotulinum.lernziele.items,
  },

  kursangeboteHeading: "UNSERE KURSANGEBOTE IN BERLIN",

  gruppenbuchungen: {
    heading: "GRUPPENBUCHUNGEN",
    description:
      "Praxisteam aus Berlin? Gerne erstellen wir maßgeschneiderte Angebote für Dich und Deine Kolleg:innen. Sende uns dazu einfach eine Anfrage mit folgendem Inhalt: Anzahl Teilnehmer:innen (min. 4 Personen), gewünschter Kursinhalt, gewünschter Zeitraum.",
    ctaLabel: "Jetzt Anfrage senden",
    ctaHref: "mailto:customerlove@ephia.de?subject=Gruppenbuchung%20Botox-Kurs%20Berlin",
  },

  inhalt: {
    ...grundkursBotulinum.inhalt,
    heading: "INHALT DES BOTOX-KURSES IN BERLIN",
  },

  location: {
    city: "Berlin",
    district: "Berlin-Mitte",
    venueName: "HY STUDIO",
    street: "Rosa-Luxemburg-Straße 20",
    postalCode: "10178",
    country: "DE",
    geo: { latitude: 52.5256, longitude: 13.4105 },
    transit: [
      "U2 Rosa-Luxemburg-Platz, ca. 3 Minuten Fußweg",
      "S- & U-Bahn Alexanderplatz, ca. 7 Minuten Fußweg",
      "Tram M4, M5, M6, Haltestelle Rosa-Luxemburg-Platz",
      "Mit dem Auto: Parkhaus Alexa (Grunerstraße 20), ca. 5 Minuten Fußweg",
    ],
    heading: "STANDORT & ANFAHRT IN BERLIN",
    paragraphs: [
      "Der Praxisteil unseres Botox-Kurses findet im HY STUDIO an der Rosa-Luxemburg-Straße 20 in Berlin-Mitte statt. Das Studio liegt fußläufig zum Alexanderplatz, ist mit allen wichtigen ÖPNV-Linien Berlins direkt erreichbar und bietet helle, ruhige Behandlungsräume mit professioneller Ausstattung.",
      "Die kleinen Gruppen (max. 6 Teilnehmer:innen pro Praxiskurs) ermöglichen eine 1:1-Betreuung durch unsere Dozent:innen. Du behandelst Deine eigene:n Proband:in oder eine:n von uns gestellte:n und bekommst direktes Feedback.",
    ],
    whyHeading: "Warum Berlin als Lernort für ästhetische Medizin?",
    whyParagraphs: [
      "Berlin ist eines der wichtigsten Zentren der ästhetischen Medizin in Deutschland. Die hohe Dichte an Praxen, eine extrem diverse Patient:innenschaft und eine aktive Fortbildungsszene machen die Stadt zum idealen Ort für Deine ersten Schritte mit Botulinumtoxin.",
      "Die Ärztekammer Berlin akkreditiert unseren Kurs mit 22 CME-Punkten. Die Praxiseinheit findet in einer Stadt statt, in der Du nach dem Kurs unmittelbar Anschluss an ein wachsendes Netzwerk von Kolleg:innen findest, sei es über unsere EPHIA Community, über Berliner Ärzt:innen-Treffen oder über Folgekurse direkt vor Ort.",
    ],
    mapsQuery: "HY STUDIO Rosa-Luxemburg-Straße 20 Berlin",
  },

  lernplattform: grundkursBotulinum.lernplattform,

  ctaBanner: {
    heading: "Bring Deine Botox-Skills in Berlin auf das nächste Level.",
    ctaLabel: "Termine in Berlin sehen",
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
        question: "Wo genau findet der Botox-Kurs in Berlin statt?",
        answer:
          "Der Praxisteil unseres Botox-Kurses findet im HY STUDIO an der Rosa-Luxemburg-Straße 20, 10178 Berlin-Mitte statt. Das Studio liegt etwa 3 Minuten Fußweg von der U2 Rosa-Luxemburg-Platz und etwa 7 Minuten vom Alexanderplatz entfernt. Den Online-Teil absolvierst Du flexibel von zu Hause aus.",
      },
      {
        question:
          "Welche CME-Punkte bekomme ich für den Botox-Kurs in Berlin?",
        answer:
          "Der Kurs ist von der Ärztekammer Berlin mit 22 CME-Punkten akkreditiert (10 Punkte Onlinekurs + 12 Punkte Praxistag). Du erhältst zusätzlich ein EPHIA-Zertifikat über die erfolgreiche Teilnahme.",
      },
      {
        question:
          "Kann ich den Botox-Kurs in Berlin auch ohne Approbation buchen?",
        answer:
          "Nein. Unser Botox-Kurs in Berlin richtet sich ausschließlich an approbierte Ärzt:innen und Zahnmediziner:innen. Diese Voraussetzung ist sowohl rechtlich als auch fachlich notwendig, da Botulinumtoxin in Deutschland verschreibungspflichtig ist und die Behandlung medizinisches Grundwissen voraussetzt. Wenn Du Patient:in bist und in Berlin eine Botox-Behandlung suchst, melde Dich gerne über unsere Proband:innen-Plattform: dort kannst Du Dich für vergünstigte Behandlungen unter Aufsicht durch unsere Ärzt:innen registrieren.",
      },
      {
        question:
          "Gibt es weitere EPHIA-Kurse in Berlin nach dem Grundkurs?",
        answer:
          "Ja. Nach dem Botox-Grundkurs kannst Du in Berlin direkt mit unseren Aufbaukursen weitermachen, etwa Aufbaukurs Lippen, Aufbaukurs Therapeutische Indikationen Botulinum oder die Masterclass Botulinum. Alle Praxistermine finden ebenfalls im HY STUDIO Berlin-Mitte statt. Die nächsten verfügbaren Termine findest Du oben im Buchungsbereich.",
      },
      ...grundkursBotulinum.faq.items,
    ],
  },

  breadcrumbLabel: "Botox-Kurs in Berlin",
};
