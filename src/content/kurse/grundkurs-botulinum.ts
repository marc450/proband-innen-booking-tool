import type { CourseLandingContent } from "./types";

/**
 * Grundkurs Botulinum — landing page content.
 *
 * Content extracted from the live LW page (ephia.de/grundkurs-botulinum).
 * Prices, sessions, and availability are pulled dynamically from Supabase
 * via the booking widget — do NOT hardcode them here.
 */
export const grundkursBotulinum: CourseLandingContent = {
  slug: "grundkurs-botulinum",
  courseKey: "grundkurs_botulinum",

  meta: {
    title: "Grundkurs Botulinum | EPHIA",
    description:
      "Grundkurs Botulinum für approbierte Ärzt:innen: Behandle Stirn, Glabella, Lachfalten und mehr unter Aufsicht an echten Proband:innen. 22 CME-Punkte, praxisnah und diskriminierungssensibel.",
    ogImage: "/kurse/grundkurs_botulinum/og-image.jpg",
  },

  hero: {
    heading: "GRUNDKURS BOTULINUM",
    socialProof: "Über 300 zertifizierte Ärzt:innen",
    subheadline:
      "Dein sicherer Einstieg in die ästhetische Medizin: Praxisnah, fundiert und mit echten Proband:innen.",
    stats: [
      { icon: "Clock", label: "Format", value: "10h Online + 6h Präsenz" },
      { icon: "Award", label: "Akkreditiert", value: "22 CME-Punkte + Zertifikat" },
      { icon: "GraduationCap", label: "Level", value: "Einsteiger:innenkurs" },
    ],
    description:
      "Lerne die Grundlagen der ästhetischen Botulinum-Anwendung mit unserem Online-, Praxis- oder Kombikurs, speziell für approbierte Ärzt:innen. Tauche in praxisnahe Inhalte ein, die Dir den Einstieg in die Behandlung von Patient:innen erleichtern oder Dein Basiswissen auffrischen. Mit uns lernst Du patient:innenzentrierte Ansätze kennen und behandelst bewusst und diskriminierungssensibel mit Botulinum und nicht NaCl.",
    videoPath: "/kurse/grundkurs_botulinum/hero-video.mp4",
    videoPoster: "/kurse/grundkurs_botulinum/hero-poster.jpg",
  },

  lernziele: {
    heading: "LERNZIELE",
    intro:
      "Nach dem Kurs kannst Du Deine ersten Patient:innen sicher, fundiert und diskriminierungssensibel mit Botulinum behandeln. Dabei konzentrieren wir uns auf die folgenden Lernziele:",
    items: [
      {
        label: "Anatomie",
        icon: "BicepsFlexed",
        description:
          "Botulinum wirkt modulierend auf die Muskulatur. Daher lernst Du bei uns wichtige anatomische Grundlagen.",
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
          "Im Kurs lernst Du verschiedene Präparate, ihre richtige Aufbereitung, Zulassung und wesentliche Unterschiede kennen.",
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
          "Wir zeigen Dir die medizinischen Grenzen von Botulinum und lehren, Patient:innen ganzheitlich, verantwortungsvoll und individuell zu behandeln.",
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
    ctaHref: "mailto:customerlove@ephia.de?subject=Gruppenbuchung%20Grundkurs%20Botulinum",
  },

  inhalt: {
    heading: "INHALT ONLINEKURS",
    intro: "Der Onlinekurs ist im Kombikurs inkludiert.",
    chapters: [
      {
        number: 1,
        title: "Begrüßung & Kursübersicht",
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
        title: "Grundlagen Botulinum",
        subsections: [
          {
            title: "Wirkweise von Botulinum",
            description:
              "Was ist Botulinumtoxin Typ A, Neurotoxine, SNAP-25, Hemmung der neuromuskulären Transmission, Wirkbeginn, Wirkmaximum, typische Patient:innenreaktionen.",
          },
          {
            title: "Botulinum-Präparate & Zulassungen",
            description:
              "Überblick über alle Präparate (Azzalure, Bocouture, Vistabel, Relabotulinum etc.), Unterschiede in Einheiten, Äquivalenz und Diffusionsverhalten, Zulassungen für ästhetische vs. medizinische Indikationen, Off-label Use.",
          },
          {
            title: "Kontraindikationen & Wechselwirkungen",
            description:
              "Absolute und relative Kontraindikationen, Wechselwirkungen mit Antibiotika, Notfallmanagement und Praxisorganisation für seltene Komplikationen.",
          },
        ],
      },
      {
        number: 3,
        title: "Anatomie des Gesichts",
        subsections: [
          {
            title: "Gesichts- und Halsmuskulatur",
            description:
              "Relevante mimische Muskulatur, motorische Endplatten, Einflüsse von Geschlecht, Alter und Ethnie auf Anatomie und Ästhetik.",
          },
          {
            title: "Gefäß- und Nervenversorgung",
            description:
              "Oberflächliche und tiefe Gefäße, relevante Nervenstrukturen und Risikoregionen.",
          },
          {
            title: "Alterungsprozesse des Gesichts",
            description:
              "Veränderungen in Haut, Fett, Knochen und Bändern, altersangepasste Dosierungen und Punktverteilungen.",
          },
        ],
      },
      {
        number: 4,
        title: "Schönheitsideale & Hintergründe",
        subsections: [
          {
            title: "Diskriminierung in der ästhetischen Medizin",
            description:
              "Rassistische, sozioökonomische und altersbezogene Ungleichheiten, \"ästhetische Ungerechtigkeit\", fehlende Repräsentation in Forschung und Studien.",
          },
          {
            title: "Vielfalt in der ästhetischen Medizin",
            description:
              "Unterschiede im Botulinum-Ansprechen je nach Geschlecht, Alter, Ethnie und Hautstruktur, anatomische und physiologische Faktoren, Bedeutung kultureller Schönheitsideale.",
          },
          {
            title: "Unrealistische Erwartungen",
            description:
              "Wunschvorstellungen, die medizinisch nicht erreichbar sind. Erkennen von übermäßigem oder fortlaufendem Behandlungswunsch.",
          },
        ],
      },
      {
        number: 5,
        title: "Beratung & Aufklärung",
        subsections: [
          {
            title: "Indikation & Kontraindikation",
            description:
              "Dynamische Falten als Hauptindikation, psychologische Faktoren, medizinische Kontraindikationen.",
          },
          {
            title: "Kommunikation & Gesprächsführung",
            description:
              "Duzen vs. Siezen, empathische und patient:innenzentrierte Gesprächsführung, klare Informationen zu Wirkung, Grenzen und zeitlicher Begrenzung von Botulinum.",
          },
          {
            title: "Realistische Zielsetzung",
            description:
              "Vermittlung erreichbarer Ergebnisse, Einsatz von Hilfsmitteln wie Handspiegel, Harmonie und Natürlichkeit als Leitprinzip.",
          },
        ],
      },
      {
        number: 6,
        title: "Vorbereitung einer Botulinum-Behandlung",
        subsections: [
          {
            title: "Vorbereitung und Suspension von Azzalure",
            description:
              "Aufbereitung mit 0,9 % NaCl, Nutzung verschiedener Konzentrationen, zusätzliche Verdünnung zur präzisen Anwendung.",
          },
          {
            title: "Vorbereitung und Suspension von Botox",
            description:
              "Vergleichbare Aufbereitung wie bei Azzalure, korrekte Rekonstitution und Dokumentation.",
          },
          {
            title: "Vorbereitung von Relfydess",
            description:
              "Ready-to-Use Flüssigbotulinum, keine Rekonstitution notwendig, vereinfachte Vorbereitung.",
          },
          {
            title: "Spread & Diffusion",
            description:
              "Begriff und wissenschaftlicher Hintergrund, Faktoren, die die Verteilung beeinflussen.",
          },
        ],
      },
      {
        number: 7,
        title: "Mythen & andere Halbwahrheiten",
        summary:
          "Diskussion verschiedenster Ideen, Mythen und Geschichten, die in den richtigen Kontext gerückt und korrigiert werden müssen.",
      },
      {
        number: 8,
        title: "Behandlung der Stirn",
        subsections: [
          {
            title: "Individuelle Analyse & Punktplatzierung",
            description:
              "Bewegungsmuster des M. frontalis analysieren, Injektionspunkte nach Aktivität wählen.",
          },
          {
            title: "Sicherheitsaspekte & Komplikationen",
            description:
              "Abstand zur Braue wahren, um Brow- oder Lidptosis zu vermeiden. Spock-Braue durch gezielte Behandlung korrigieren.",
          },
          {
            title: "Dosierung & Technik",
            description:
              "Dosierung für unterschiedliche Muskelgruppen, vaskuläre Okklusion bei hartnäckigen Falten.",
          },
          {
            title: "Anzeichnen & Injektion",
            description:
              "Am Beispiel von drei unterschiedlichen Patient:innen.",
          },
        ],
      },
      {
        number: 9,
        title: "Behandlung der Glabella",
        subsections: [
          {
            title: "Relevante Muskeln & Anatomie",
            description:
              "M. corrugator supercilii, M. procerus, M. depressor supercilii, individuelle Kontraktionsmuster.",
          },
          {
            title: "Ziele & Indikationen",
            description:
              "Reduktion der Zornesfalten und Entlastung des Stirnmuskels.",
          },
          {
            title: "Technik & Dosierung",
            description:
              "Präzise Platzierung entsprechend der Muskelansätze, Dosierungsanpassung je nach Präparat.",
          },
          {
            title: "Anzeichnen & Injektion",
            description:
              "Am Beispiel von drei unterschiedlichen Patient:innen.",
          },
        ],
      },
      {
        number: 10,
        title: "Behandlung der Lachfalten",
        subsections: [
          {
            title: "Anatomie & Zone",
            description:
              "Behandlung des seitlichen Anteils des M. orbicularis oculi, Berücksichtigung individueller Faltenmuster.",
          },
          {
            title: "Ansatz & Technik",
            description:
              "Oberflächliche, flächige Behandlung statt tiefer Punktinjektionen, Orientierung am natürlichen Muskelzug.",
          },
          {
            title: "Wichtige Hinweise",
            description:
              "Häufige Neigung zu Hämatomen. Unterlidfalten sind oft nur eingeschränkt mit Botulinum behandelbar.",
          },
          {
            title: "Anzeichnen & Injektion",
            description: "Am Beispiel eines Patienten.",
          },
        ],
      },
      {
        number: 11,
        title: "Behandlung der Augenbraue (\"Brow-Lifting\")",
        subsections: [
          {
            title: "Relevante Muskeln",
            description:
              "Zusammenspiel von Glabella-Gruppe, M. frontalis und M. orbicularis oculi. Unterschiedliche Anteile beeinflussen medialen und lateralen Brauenverlauf.",
          },
          {
            title: "Behandlungsansatz",
            description:
              "Senkende Muskelanteile gezielt entspannen, um eine Hebung zu erzielen. Berücksichtigung individueller anatomischer und ästhetischer Unterschiede.",
          },
          {
            title: "Besonderheiten",
            description:
              "Geschlechtsspezifische Unterschiede in Form und Höhe der Braue, begrenzte Wirkung bei ausgeprägter Lidptosis.",
          },
          {
            title: "Anzeichnen & Injektion",
            description:
              "Am Beispiel von drei unterschiedlichen Patient:innen.",
          },
        ],
      },
      {
        number: 12,
        title: "Behandlung des Platysmas",
        subsections: [
          {
            title: "Anatomie & Zone",
            description:
              "Behandlung der vertikalen Platysmastränge am Hals, Beachtung individueller Ausprägung und Muskelzug.",
          },
          {
            title: "Behandlungsansatz",
            description:
              "Gleichmäßige Entspannung sichtbarer Stränge, Anpassung der Punktverteilung an Länge und Verlauf.",
          },
          {
            title: "Wichtige Hinweise",
            description:
              "Risiko benachbarter Strukturen beachten, Wirkung auf Kontur und Halsprofil realistisch kommunizieren.",
          },
          {
            title: "Anzeichnen & Injektion",
            description:
              "Am Beispiel von drei unterschiedlichen Patient:innen.",
          },
        ],
      },
      {
        number: 13,
        title: "Rechnung, Honorarvereinbarung & Patient:innen-Information",
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
          "Im Reiter „Austausch\" kannst Du Fragen stellen und Dich mit der Community und Dozierenden austauschen.",
        ],
        mediaPath: "/kurse/grundkurs_botulinum/plattform/navigation.png",
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
        mediaPoster: "/kurse/grundkurs_botulinum/plattform/behandlung-poster.jpg",
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
        mediaPath: "/kurse/grundkurs_botulinum/plattform/inhalte.png",
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
        mediaPath: "/kurse/grundkurs_botulinum/plattform/tests.png",
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
        question:
          "Muss ich approbierte Ärztin / approbierter Arzt sein, um an den Kursen teilnehmen zu können?",
        answer:
          "Ja, unsere Kurse richten sich speziell an approbierte Ärztinnen und Ärzte. Dies stellt sicher, dass alle Teilnehmenden über die notwendige medizinische Grundlage verfügen, um die komplexen Inhalte der ästhetischen Medizin, insbesondere im Umgang mit Botox und dermalen Fillern, sicher anwenden zu können. Unsere Weiterbildungsangebote sind darauf ausgelegt, Fachkräfte in der ästhetischen Medizin mit dem neuesten Wissen und praktischen Fähigkeiten auszustatten, um eine hochwertige Patient:innenversorgung zu gewährleisten.",
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
          "Um Behandlungssicherheit zu erlangen, empfehlen wir Dir einen Kombikurs zu belegen, bei dem Du ausreichend praktische Erfahrung unter Aufsicht sammeln kannst. Danach sind wir überzeugt, dass Du das Selbstbewusstsein haben wirst, Deine eigenen Patient:innen kompetent und sicher zu behandeln. Es ist allerdings wichtig, dass Du auch die rechtlichen Vorgaben und berufsrechtlichen Rahmenbedingungen in Deinem Land bzw. in Deiner Region beachtest. Diese können sich auf die erforderlichen Qualifikationen und die Zulassung zur Ausübung der ästhetischen Medizin beziehen. Stelle also sicher, dass Du alle notwendigen Bedingungen erfüllst, bevor Du mit der Behandlung von Patient:innen beginnst. Wir wollen, dass Du sicher und hochwertig Deine Patient:innen behandeln kannst. Darum begleiten wir Dich auch mit unserer Community nach Deiner Ausbildung bei uns in Deiner praktischen Tätigkeit.",
      },
      {
        question: "Ist mein:e Proband:in für den Kurs geeignet?",
        answer:
          "Grundsätzlich hängt die Eignung einer Proband:in immer davon ab, welche Zone zuletzt behandelt wurde. Für unsere Kurse, insbesondere für Anfänger:innen, ist es wichtig, dass die Muskelaktivität und -kontraktion gut sichtbar und beurteilbar ist. Das entspricht unserem Lernziel, da wir stark mit funktioneller Anatomie arbeiten und die Beurteilung der Muskelbewegung eine zentrale Rolle spielt. Deshalb können wir keine festen Zeiträume oder Mindestabstände angeben. Je nach Dosierung, behandelter Region und individueller Anatomie kann Botulinum unterschiedlich lange im Gewebe wirken und die Muskelaktivität beeinflussen.",
      },
    ],
  },
};
