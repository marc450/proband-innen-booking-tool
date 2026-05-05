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
    title: "Botox-Kurs für Ärzt:innen | 22 CME, Ärztekammer Berlin | EPHIA",
    description:
      "Botox-Kurs für approbierte Ärzt:innen mit 22 CME (Ärztekammer Berlin). Onlinekurs, Praxistag an echten Proband:innen in Berlin-Mitte. Kleine Gruppen, sicherer Einstieg.",
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
      "Du bist approbierte:r Ärzt:in und möchtest mit Botox-Behandlungen einsteigen? Unser Botox-Kurs für Ärzt:innen ist Dein strukturierter Weg vom ersten Onlinekurs bis zur sicheren Behandlung Deiner ersten Patient:innen. Im Onlinekurs lernst Du Anatomie, Produktkunde, alle relevanten Indikationen (Stirn, Glabella, Lachfalten, Brow-Lifting, Platysma) sowie Komplikationsmanagement und Aufklärung. Am Praxistag in Berlin-Mitte behandelst Du dann echte Proband:innen unter Aufsicht erfahrener Dozent:innen, geübt wird mit Botulinum statt NaCl, in kleinen Gruppen mit max. 7 Teilnehmer:innen. Insgesamt erreichst Du {cme_kombi} CME-Punkte, akkreditiert mit der Ärztekammer Berlin. Voraussetzung ist Deine Approbation als Humanmediziner:in, Vorerfahrung in ästhetischer Medizin brauchst Du nicht.",
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

  audience: {
    heading: "FÜR WEN IST DIESER KURS?",
    intro:
      "Unser Botox-Kurs für Ärzt:innen richtet sich an approbierte Humanmediziner:innen, unabhängig vom Fachgebiet. Du musst nicht in der Dermatologie oder plastischen Chirurgie tätig sein, um sicher mit Botulinum zu behandeln. Was Du brauchst, ist eine fundierte Fortbildung mit klinischer Tiefe.",
    items: [
      {
        title: "Allgemeinmedizin",
        description:
          "Du suchst eine privatärztliche Behandlungssäule, die sich planbar in den Praxisalltag einfügt, ohne den GKV-Sprechstundenbetrieb zu belasten.",
      },
      {
        title: "Innere Medizin",
        description:
          "Du bringst differentialdiagnostisches Denken mit und überträgst Deine Indikationsstellung systematisch auf ein neues, evidenzbasiertes Anwendungsfeld.",
      },
      {
        title: "Dermatologie",
        description:
          "Du sprichst täglich über Hautalterung und Lichtschäden. Botulinum erweitert Dein Spektrum um eine zur Sprechstunde passende, selbstzahlerfähige Säule.",
      },
      {
        title: "HNO und MKG-Chirurgie",
        description:
          "Du kennst die periorale, periorbitale und Stirn-Anatomie aus operativer Tätigkeit. Botulinum nutzt diese Anatomie konservativ, etwa bei perioralen Falten oder Bruxismus.",
      },
      {
        title: "Gynäkologie",
        description:
          "Du betreust Frauen in Lebensphasen, in denen sich der äußere Eindruck verändert. Botulinum lässt sich sinnvoll in Vorsorge- und Hormonsprechstunden integrieren.",
      },
      {
        title: "Chirurgie und Plastische Chirurgie",
        description:
          "Du ergänzt Deine operative Tätigkeit um eine nicht-invasive Methode, die Patient:innen vor oder zwischen OP-Indikationen angeboten werden kann.",
      },
      {
        title: "Augenheilkunde",
        description:
          "Periokuläre Anatomie und Brow-Lifting sind Dir vertraut. Botulinum ist eine elegante Erweiterung Deiner lid- und periorbitalen Sprechstunde.",
      },
      {
        title: "Anästhesie und weitere Fachgebiete",
        description:
          "Wenn Du eine Privatpraxis als zweites Standbein aufbauen oder aus dem Schichtdienst aussteigen möchtest, bietet Botulinum einen strukturierten Einstieg.",
      },
    ],
  },

  differentiators: {
    heading: "WAS UNSEREN BOTOX-KURS UNTERSCHEIDET",
    intro:
      "Viele Botulinum-Kurse für Ärzt:innen werden direkt oder indirekt von Pharmaunternehmen finanziert. Das ist nicht per se schlecht, prägt aber Inhalt, Indikationsbreite und Produkterwartung. Bei EPHIA arbeiten wir bewusst herstellerunabhängig, weil ästhetische Medizin medizinische Entscheidungen verlangt, nicht Produkterwartung.",
    items: [
      {
        title: "Herstellerunabhängig und evidenzbasiert",
        description:
          "Wir werden nicht von Botulinum-Herstellern finanziert. Inhalte, Indikationen und Dosierungsempfehlungen orientieren sich ausschließlich an klinischer Evidenz, anatomischer Notwendigkeit und Patient:innensicherheit, nicht an Marketingzielen einzelner Präparate.",
      },
      {
        title: "Praxistag mit echten Proband:innen statt NaCl",
        description:
          "Du injizierst am Praxistag in Berlin-Mitte echtes Botulinum, nicht eine Kochsalz-Übungslösung. Du arbeitest unter Aufsicht erfahrener Dozent:innen in kleinen Gruppen mit max. 7 Teilnehmer:innen, und Du erlebst die Wirkung an einer realen Patient:innenkonstellation, nicht in einer Simulation.",
      },
      {
        title: "Diskriminierungssensibel und inklusiv",
        description:
          "Schönheitsideale sind kulturell und individuell, nicht universell. Wir lehren Botulinum-Anwendung ausdrücklich diskriminierungssensibel, mit Blick auf Ethnie, Gender und Alter, weil Patient:innen mit ihrer eigenen Vorstellung kommen, nicht mit einer Hochglanzschablone.",
      },
      {
        title: "Begleitung über den Kursabschluss hinaus",
        description:
          "Nach Deinem Praxistag bleibst Du Teil der EPHIA-Ärzt:innen-Community, mit Indikationsfragen, Abrechnungsfragen, Fallbesprechungen und kollegialem Austausch. Wir verkaufen Dir keinen Wochenendkurs, wir begleiten Deinen Einstieg in die ästhetische Medizin.",
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
    // Pricing claims in items below are hardcoded (Onlinekurs 490 €,
    // Online- & Praxiskurs 1.290 €, Komplettpaket 1.998 €). The first
    // two come from course_templates.price_gross_online /
    // price_gross_kombi for grundkurs_botulinum; the third is the
    // PremiumCard default in widget/premium-card.tsx. Keep these in
    // sync if Supabase prices change.
    items: [
      {
        question: "Was kostet der Botox-Kurs für Ärzt:innen?",
        answer:
          "Der Botox-Kurs für Ärzt:innen ist in drei Paketen buchbar. Der Onlinekurs Botulinum kostet 490 € und ist mit 10 CME-Punkten der Ärztekammer Berlin akkreditiert. Der Online- & Praxiskurs verbindet den vollständigen Onlinekurs mit dem 6-stündigen Praxistag in Berlin-Mitte und kostet 1.290 € (22 CME-Punkte insgesamt). Das Komplettpaket bündelt den Praxistag mit dem Botulinum-Onlinekurs sowie drei begleitenden Onlinekursen (Periorale Zone, Therapeutische Indikationen, Medizinische Hautpflege) für 1.998 € statt 2.220 € und bringt Dir 49 CME-Punkte. Ratenzahlung ist mit Klarna möglich.",
      },
      {
        question: "Wie viele CME-Punkte bekomme ich, und wer akkreditiert?",
        answer:
          "Der Botox-Kurs für Ärzt:innen ist mit der Ärztekammer Berlin akkreditiert. Im Onlinekurs erhältst Du 10 CME-Punkte, der 6-stündige Praxistag bringt 12 weitere CME-Punkte. Im Online- & Praxiskurs sind das insgesamt 22 CME-Punkte. Wenn Du das Komplettpaket buchst, summieren sich Onlinekurse, Praxistag und begleitende Module auf 49 CME-Punkte. Die CME-Punkte werden nach Kursabschluss elektronisch über Deine EFN-Nummer an die für Dich zuständige Ärztekammer übertragen, sofern Du Deine EFN bei der Buchung hinterlegst.",
      },
      {
        question: "Wo findet der Praxistag statt?",
        answer:
          "Der Praxistag findet in Berlin-Mitte statt, im HYSTUDIO in der Rosa-Luxemburg-Straße 20, gegenüber dem Volksbühnenplatz und etwa fünf Minuten Fußweg vom Alexanderplatz. Wir nutzen Berlin als zentralen Standort, weil Teilnehmer:innen aus dem gesamten Bundesgebiet sowie aus Österreich und der Schweiz anreisen und Berlin per Bahn und Flugzeug am besten erreichbar ist. Aktuell führen wir keine Praxistage in München, Hamburg, Frankfurt oder anderen Städten durch. Eine Übernachtungsempfehlung erhältst Du nach Buchung.",
      },
      {
        question:
          "Wann finden 2026 die nächsten Botox-Kurse für Ärzt:innen statt?",
        answer:
          "Wir bieten 2026 etwa zwei bis drei Praxistage pro Monat in Berlin-Mitte an. Die nächsten verfügbaren Termine findest Du oben in den Kursangeboten, sie aktualisieren sich live nach jeder Buchung. Frühe Buchungen empfehlen sich, weil unsere Gruppen mit max. 7 Teilnehmer:innen klein sind und beliebte Wochenenden früh ausgebucht sind. Wenn Du unsicher bist, ob Dein Wunschtermin noch verfügbar ist, kannst Du uns vor der Buchung unter customerlove@ephia.de erreichen.",
      },
      {
        question: "Ist der Botox-Kurs auch komplett online möglich?",
        answer:
          "Ja. Du kannst den Onlinekurs Botulinum als reine Theoriefortbildung für 490 € buchen, mit 10 CME-Punkten und 1,5 Jahren Zugriff inklusive Updates. Du lernst dort Anatomie, Produktkunde, alle wichtigen Indikationen und Komplikationsmanagement. Bevor Du Patient:innen behandelst, empfehlen wir den Online- & Praxiskurs (1.290 €) oder das Komplettpaket (1.998 €), weil erst der Praxistag unter Aufsicht erfahrener Dozent:innen den supervidierten Übergang von Theorie zu eigenverantwortlicher Behandlung ermöglicht. Aus berufsrechtlicher Sicht ist die Kombination aus Theorie und Praxistraining vor der ersten Patient:innenbehandlung dringend empfohlen.",
      },
      {
        question:
          "Können auch Ärzt:innen aus Österreich oder der Schweiz teilnehmen?",
        answer:
          "Ja, herzlich willkommen. Unser Botox-Kurs richtet sich an alle approbierten Humanmediziner:innen im deutschsprachigen Raum. Wir empfangen regelmäßig Teilnehmer:innen aus Österreich und der Schweiz, der Praxistag in Berlin-Mitte ist per Bahn aus Wien und Zürich gut erreichbar. Die berufsrechtlichen Rahmenbedingungen für ästhetische Botulinum-Anwendung weichen zwischen den DACH-Ländern leicht ab. Das EPHIA-Zertifikat wird in der Regel als Fortbildungsnachweis anerkannt, die endgültige Anrechnung bei Deiner Standeskammer (z. B. Österreichische Ärztekammer, FMH) richtet sich aber nach lokalen Bestimmungen.",
      },
      {
        question: "Welches Zertifikat erhalte ich nach dem Kurs?",
        answer:
          "Nach Abschluss des Online- & Praxiskurses oder des Komplettpakets erhältst Du eine Teilnahmebescheinigung der Ärztekammer Berlin mit den entsprechenden CME-Punkten sowie das EPHIA-Zertifikat. Beide Dokumente kannst Du als Nachweis Deiner strukturierten Fortbildung verwenden, beispielsweise gegenüber Aufsichtsbehörden, Berufshaftpflichtversicherern oder zur transparenten Aufklärung Deiner Patient:innen. Den reinen Botulinum-Onlinekurs schließt Du mit einem EPHIA-Zertifikat ab. Beide Zertifikate sind keine staatlich anerkannte Zusatzbezeichnung, eine solche gibt es in Deutschland für die ästhetische Botulinum-Behandlung aktuell nicht.",
      },
      {
        question: "Was kommt nach dem Botox-Kurs als nächster Schritt?",
        answer:
          "Sobald Du sicher mit Botulinum behandelst, kannst Du Dein Behandlungsspektrum gezielt erweitern. Naheliegende nächste Schritte sind der Aufbaukurs Botulinum: Periorale Zone, der Aufbaukurs Therapeutische Indikationen (Bruxismus, Migräne, Hyperhidrosis) sowie der Grundkurs Dermalfiller für die Hyaluronsäure-Behandlung. Wenn Du den vollständigen Weg von Anfang an strukturieren möchtest, ist unser Curriculum Botulinum eine Empfehlung, die Theorie, Praxis und Supervision aufeinander aufbaut. Nach jedem Kurs bleibst Du Teil unserer Ärzt:innen-Community und kannst Fälle besprechen, Indikations- und Abrechnungsfragen stellen sowie kollegialen Austausch nutzen.",
      },
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
  relatedCourses: [
    "botox-kurs-fuer-zahnaerzte",
    "botox-kurs-fuer-anfaenger",
    "botox-kurs-berlin",
  ],
};
