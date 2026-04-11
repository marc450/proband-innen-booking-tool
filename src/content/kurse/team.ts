import type { TeamPageContent } from "./team-types";

/**
 * Content for the `/kurse/team` page.
 *
 * One combined grid shows Dozent:innen and operations / founders /
 * brand together. People with a `curriculum` get a subtle "Vita
 * ansehen →" link on their card that opens the detailed modal.
 * Review-Board gets its own dedicated section below.
 */
export const teamContent: TeamPageContent = {
  meta: {
    title: "Team & Dozent:innen — EPHIA",
    description:
      "Lerne die Menschen hinter EPHIA kennen: unser Team aus Dozent:innen, Operations und unser wissenschaftliches Review-Board.",
  },

  hero: {
    heading: "Unser Team",
    intro:
      "Bei EPHIA lernst Du von einem Team aus praktizierenden Ärzt:innen, die täglich selbst am Patient:innenbett stehen. Gemeinsam mit unserem Operations- und Brand-Team sorgen sie dafür, dass jeder Kurs fachlich und didaktisch auf höchstem Niveau abläuft.",
  },

  team: {
    // No heading/intro here — the page hero already says "Unser Team".
    // The grid renders straight below the hero without a duplicate header.
    vitaLinkLabel: "Vita ansehen",
    items: [
      {
        id: "sophia-wilk-vollmann",
        // U+2011 non-breaking hyphen keeps "Wilk‑Vollmann" together on
        // narrow card widths so the surname never splits across lines.
        name: "Dr. Sophia Wilk\u2011Vollmann",
        role: "Mitgründerin & Dozentin",
        imagePath:
          "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/team/sophia.png",
        imageAlt: "Porträt von Dr. Sophia Wilk-Vollmann",
        shortBio:
          "Fachärztin für Anästhesie mit eigener Praxis für ästhetische Medizin. Sophia hat EPHIA gegründet, um ästhetische Medizin inklusiver, evidenzbasierter und patient:innenzentrierter zu machen.",
        curriculum: {
          tagline:
            "Praxistätigkeit seit 2017 — spezialisiert auf minimal invasive Verfahren & Lasermedizin.",
          sections: [
            {
              heading: "Ästhetische Medizin",
              intro:
                "Eigene Praxis seit 2017, Schwerpunkt auf minimal invasiven Verfahren, Myomodulation und Lasermedizin.",
              items: [
                {
                  label: "Ausbildung unter anderem bei:",
                  items: [
                    "Dr. Mauricio de Maio (MD Codes™)",
                    "Dr. Arthur Swift",
                    "Dr. Raul Cetto",
                    "Dr. Tatjana Pavicic",
                    "Dr. Sabrina Fabi",
                  ],
                },
              ],
            },
            {
              heading: "Klinische Medizin",
              items: [
                "Fachärztin für Anästhesiologie",
                "DESAIC (European Diploma in Anaesthesiology and Intensive Care)",
                "Zusatzbezeichnung Notfallmedizin",
                "DEGUM I (Deutsche Gesellschaft für Ultraschall in der Medizin)",
              ],
            },
            {
              heading: "Klinische Tätigkeit",
              items: [
                "Assistenzärztin und Fachärztin an universitären Maximalversorgern",
                "Langjährige Erfahrung in Anästhesie, Intensiv- und Notfallmedizin",
                {
                  label: "Rotationen:",
                  items: [
                    "Kardioanästhesie",
                    "Kinderanästhesie",
                    "Schmerztherapie",
                  ],
                },
              ],
            },
            {
              heading: "Auslandstätigkeit",
              intro:
                "Internationale Einsätze in medizinischer Versorgung und Lehre.",
              items: [
                "Vietnam",
                "Südafrika",
                "Rotes Meer / Jemen",
                "Mali",
                "Afghanistan",
              ],
            },
            {
              heading: "Fachgesellschaftsmitgliedschaften",
              items: [
                "DGÄPC (Deutsche Gesellschaft für Ästhetisch-Plastische Chirurgie)",
                "DGBT (Deutsche Gesellschaft für ästhetische Botulinumtoxin-Therapie)",
                "DDL (Deutsche Dermatologische Lasergesellschaft)",
                "DGAI (Deutsche Gesellschaft für Anästhesiologie und Intensivmedizin)",
                "BDA (Berufsverband Deutscher Anästhesisten)",
                "ESAIC (European Society of Anaesthesiology and Intensive Care)",
                "DIVI (Deutsche Interdisziplinäre Vereinigung für Intensiv- und Notfallmedizin)",
                "DGINA (Deutsche Gesellschaft Interdisziplinäre Notfall- und Akutmedizin)",
              ],
            },
          ],
        },
      },
      {
        id: "marc-wyss",
        name: "Marc Wyss",
        role: "Mitgründer",
        imagePath:
          "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/team/marc.jpg",
        imageAlt: "Porträt von Marc Wyss",
        shortBio:
          "Marc kümmert sich um Technologie, Produkt und Operations. Er hat EPHIA gemeinsam mit Sophia gegründet und baut die Plattform, mit der wir täglich arbeiten.",
      },
      {
        id: "tina-bellinghausen",
        name: "Tina Bellinghausen",
        role: "Dozentin",
        imagePath:
          "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/team/tina.png",
        imageAlt: "Porträt von Tina Bellinghausen",
        shortBio:
          "Approbierte Ärztin mit Schwerpunkt auf ästhetischer Medizin. Tina unterstützt unsere Kurse als Dozentin und teilt ihre Erfahrung aus der täglichen Praxis.",
        curriculum: {
          tagline:
            "Praxistätigkeit seit 2020, spezialisiert auf minimal invasive Verfahren.",
          sections: [
            {
              heading: "Ästhetische Medizin",
              intro:
                "Praxistätigkeit seit 2020, spezialisiert auf minimal invasive Verfahren.",
              items: [
                {
                  label: "Ausbildung unter anderem bei:",
                  items: [
                    "Merita Schojai-Schultz (Lieb Dein Gesicht)",
                    "diverse Galderma Fortbildungen",
                    "HyStudio",
                    "Fortbildungen und mehrere Hospitationen bei Dr. Sophia Bethge",
                    "Fortbildung bei Irina Myssak",
                    "Fortbildung im HLP (Haut- und Laserzentrum Berlin)",
                    "Fortbildung bei Dr. Flavia Radke",
                  ],
                },
              ],
            },
            {
              heading: "Klinische Medizin",
              items: ["Fachärztin für Neurochirurgie"],
            },
            {
              heading: "Klinische Tätigkeit",
              items: [
                "Seit 2012: Neurochirurgie im Sankt Gertrauden-Krankenhaus",
              ],
            },
            {
              heading: "Auslandstätigkeit",
              items: [
                "12th Istanbul Yasargil Microneurosurgery Course (Istanbul)",
              ],
            },
            {
              heading: "Fachgesellschaftsmitgliedschaften",
              items: ["Ärztekammer Berlin"],
            },
          ],
        },
      },
      {
        id: "sarah-bechstein",
        name: "Dr. Sarah Bechstein",
        role: "Dozentin",
        imagePath:
          "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/team/sarah.jpg",
        imageAlt: "Porträt von Dr. Sarah Bechstein",
        shortBio:
          "Dr. Sarah Bechstein ist Fachärztin und erfahrene Dozentin im Bereich ästhetische Medizin. Ihre Schwerpunkte umfassen Botulinum- und Fillerbehandlungen.",
      },
      {
        id: "sarah-stannek",
        name: "Dr. Sarah Stannek",
        role: "Dozentin",
        imagePath:
          "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/team/sarah-stannek.jpg",
        imageAlt: "Porträt von Dr. Sarah Stannek",
        shortBio:
          "Dr. Sarah Stannek begleitet unsere Kurse mit klinischer Expertise und hohem didaktischem Anspruch. Schwerpunkt: evidenzbasierte Injektionstechniken.",
        curriculum: {
          tagline:
            "Praxistätigkeit seit 2021, spezialisiert auf minimal invasive Verfahren und Lasermedizin.",
          sections: [
            {
              heading: "Ästhetische Medizin",
              intro:
                "Praxistätigkeit seit 2021, spezialisiert auf minimal invasive Verfahren und Lasermedizin.",
              items: [
                {
                  label: "Ausbildung unter anderem bei:",
                  items: [
                    "M1",
                    "HY Studio",
                    "Kalialab",
                    "DGBT Fortbildung",
                    "Produktschulungen (Galderma, Merz, Nordberg Medical, InMode, Croma, Evolus)",
                  ],
                },
              ],
            },
            {
              heading: "Klinische Medizin",
              items: ["Fachärztin für HNO und Kopf-Hals-Chirurgie"],
            },
            {
              heading: "Klinische Tätigkeit",
              intro: "Seit 2024:",
              items: [
                "Praxistätigkeit in der plastischen Chirurgie im Rahmen der Weiterbildung zur plastischen Gesichtschirurgin",
                "Fachärztin bei Plastethics by Dr. Juliane Bodo",
                "Rhino- und Blepharoplastik Fortbildungen im In- und Ausland",
                "Hospitation bei Prof. Dr. Frank Riedel, Mannheim",
              ],
            },
            {
              heading: "Auslandstätigkeit",
              items: [
                "Fellowship ENT Clinic, Rambam Hospital, Haifa, Israel",
              ],
            },
            {
              heading: "Fachgesellschaftsmitgliedschaften",
              items: [
                "DGBT (Deutsche Gesellschaft für ästhetische Botulinumtoxin-Therapie)",
                "GÄCD (Gesellschaft für Ästhetische Chirurgie Deutschland)",
                "EAFPS (European Academy of Facial Plastic Surgery)",
                "DGHNO (Deutsche Gesellschaft für Hals-Nasen-Ohren-Heilkunde)",
                "HNO Berufsverband",
                "Ärztekammer Berlin",
              ],
            },
          ],
        },
      },
      {
        id: "pauline-freidl",
        name: "Pauline Freidl",
        role: "Dozentin",
        imagePath:
          "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/team/pauline.png",
        imageAlt: "Porträt von Pauline Freidl",
        shortBio:
          "Approbierte Ärztin und Dozentin bei EPHIA. Pauline bringt eine ruhige, strukturierte Art in ihre Kurse und begleitet Teilnehmer:innen eng bei den praktischen Übungen.",
        curriculum: {
          tagline:
            "Praxistätigkeit seit 2021, spezialisiert auf minimal invasive Verfahren.",
          sections: [
            {
              heading: "Ästhetische Medizin",
              intro:
                "Praxistätigkeit seit 2021, spezialisiert auf minimal invasive Verfahren.",
              items: [
                {
                  label: "Ausbildung unter anderem bei:",
                  items: [
                    "Maja Waibel",
                    "diverse Merz Fortbildungen",
                    "diverse Galderma Fortbildungen",
                    "HYSTUDIO",
                    "Lara Pfahl",
                    "MIA Akademie",
                    "DERMA MEDICAL",
                    "EPHIA Academy",
                  ],
                },
              ],
            },
            {
              heading: "Klinische Tätigkeit",
              items: [
                "HYSTUDIO",
                "2023 bis 2025: angioclinic® Berlin",
                "2021: KMG Klinikum Luckenwalde",
                "2021: Evangelisches Waldkrankenhaus Spandau",
              ],
            },
            {
              heading: "Fachgesellschaftsmitgliedschaften",
              items: [
                "Ärztekammer Berlin",
                "DGPL (Deutsche Gesellschaft für Phlebologie und Lymphologie)",
              ],
            },
          ],
        },
      },
      {
        id: "jana-steyer",
        name: "Jana Steyer",
        role: "Kurskoordinatorin",
        imagePath:
          "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/team/jana.jpg",
        imageAlt: "Porträt von Jana Steyer",
        shortBio:
          "Jana ist Deine erste Ansprechpartnerin rund um unsere Kurse — von der Buchung über die Organisation bis hin zu Proband:innen-Fragen.",
      },
      {
        id: "kathrin-schiebler",
        name: "Kathrin Schiebler",
        role: "Brand Consulting",
        imagePath:
          "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/team/kathrin.png",
        imageAlt: "Porträt von Kathrin Schiebler",
        shortBio:
          "Kathrin begleitet EPHIA strategisch bei allem rund um Brand, Kommunikation und Visual Identity.",
      },
    ],
  },

  reviewBoard: {
    heading: "Unser Review-Board",
    intro:
      "Unser Review-Board stellt sicher, dass unsere Kursinhalte wissenschaftlich fundiert, aktuell und inklusiv bleiben.",
    items: [
      {
        id: "yawen-wang",
        name: "Prof. Dr. Yawen Wang",
        role: "Review-Board",
        imagePath:
          "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/team/yawen.png",
        imageAlt: "Porträt von Prof. Dr. Yawen Wang",
        shortBio:
          "Prof. Dr. Yawen Wang bringt ihre wissenschaftliche Expertise in unsere Kurskurierung ein und achtet auf Evidenzbasierung.",
      },
      {
        id: "camea-jamet",
        name: "Caméa Jamet",
        role: "Review-Board",
        imagePath:
          "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/team/camea.png",
        imageAlt: "Porträt von Caméa Jamet",
        shortBio:
          "Caméa Jamet begleitet EPHIA fachlich und achtet besonders auf Inklusivität und Diversität in unseren Kursinhalten.",
      },
      {
        id: "ephsona-shencoru",
        name: "Dr. Ephsona Shencoru",
        role: "Review-Board",
        imagePath:
          "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/team/ephsona.png",
        imageAlt: "Porträt von Dr. Ephsona Shencoru",
        shortBio:
          "Dr. Ephsona Shencoru unterstützt das Review-Board mit ihrer klinischen und wissenschaftlichen Erfahrung.",
      },
    ],
  },

  cta: {
    heading: "Werde Teil von EPHIA",
    body: "Wir freuen uns über Initiativbewerbungen von Ärzt:innen und Menschen, die unsere Mission teilen. Schick uns einfach Deine Unterlagen per E-Mail.",
    email: "marc@ephia.de",
    bullets: ["Motivationsschreiben", "Lebenslauf (ohne Foto)"],
  },
};
