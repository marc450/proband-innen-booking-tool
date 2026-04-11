import type { TeamPageContent } from "./team-types";

/**
 * Content for the combined `/kurse/team` page.
 *
 * This page merges the old `/team` and `/dozent-innen` pages from the
 * LearnWorlds site into one surface:
 *
 *   1. Hero
 *   2. Unsere Dozent:innen — full cards with a "Vita ansehen" modal
 *      showing each doctor's detailed curriculum.
 *   3. Unser Team — operations / brand / founders (smaller cards).
 *   4. Unser Review-Board — scientific advisors (smaller cards).
 *   5. Initiativbewerbung CTA.
 *
 * Dr. Sophia Wilk-Vollmann's curriculum is fully wired up as the
 * working example. Other Dozent:innen have shortBio only for now —
 * we can extend their `curriculum` object as Sophia sends the
 * content over.
 */
export const teamContent: TeamPageContent = {
  meta: {
    title: "Team & Dozent:innen — EPHIA",
    description:
      "Lerne die Menschen hinter EPHIA kennen: unsere Dozent:innen, unser Operations-Team und unser wissenschaftliches Review-Board.",
  },

  hero: {
    eyebrow: "Menschen hinter EPHIA",
    heading: "Unser Team & unsere Dozent:innen",
    intro:
      "Bei EPHIA lernst Du von einem Team aus praktizierenden Ärzt:innen, die täglich selbst am Patient:innenbett stehen. Wir bringen klinische Erfahrung, didaktische Sorgfalt und eine inklusive Haltung in jeden unserer Kurse.",
  },

  dozenten: {
    eyebrow: "Lehrteam · LÄK-zertifiziert",
    heading: "Unsere Dozent:innen",
    intro:
      "Alle unsere Dozent:innen sind approbierte Ärzt:innen mit eigener Praxiserfahrung in der ästhetischen Medizin. Wirf einen Blick auf ihre Vita, um mehr über ihre Ausbildung und Schwerpunkte zu erfahren.",
    ctaLabel: "Vita ansehen",
    items: [
      {
        id: "sophia-wilk-vollmann",
        name: "Dr. Sophia Wilk-Vollmann",
        role: "EPHIA Mitgründerin & Dozentin",
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
        id: "tina-bellinghausen",
        name: "Christina-Julia Bellinghausen",
        role: "Dozentin",
        imagePath:
          "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/team/tina.png",
        imageAlt: "Porträt von Christina-Julia Bellinghausen",
        shortBio:
          "Approbierte Ärztin mit Schwerpunkt auf ästhetischer Medizin. Tina unterstützt unsere Kurse als Dozentin und teilt ihre Erfahrung aus der täglichen Praxis.",
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
      },
    ],
  },

  team: {
    eyebrow: "Operations · Brand · Founders",
    heading: "Unser Team",
    intro:
      "Hinter den Kulissen sorgt ein kleines, engagiertes Team dafür, dass unsere Kurse reibungslos laufen und EPHIA weiterwächst.",
    items: [
      {
        name: "Marc Wyss",
        role: "Mitgründer",
        imagePath:
          "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/team/marc.jpg",
        imageAlt: "Porträt von Marc Wyss",
        shortBio:
          "Marc kümmert sich um Technologie, Produkt und Operations. Er hat EPHIA gemeinsam mit Sophia gegründet und baut die Plattform, mit der wir täglich arbeiten.",
      },
      {
        name: "Jana Steyer",
        role: "Kurskoordinatorin",
        imagePath:
          "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/team/jana.jpg",
        imageAlt: "Porträt von Jana Steyer",
        shortBio:
          "Jana ist Deine erste Ansprechpartnerin rund um unsere Kurse — von der Buchung über die Organisation bis hin zu Proband:innen-Fragen.",
      },
      {
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
    eyebrow: "Wissenschaftlich begleitet",
    heading: "Unser Review-Board",
    intro:
      "Unser Review-Board stellt sicher, dass unsere Kursinhalte wissenschaftlich fundiert, aktuell und inklusiv bleiben.",
    items: [
      {
        name: "Prof. Dr. Yawen Wang",
        role: "Review-Board",
        imagePath:
          "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/team/yawen.png",
        imageAlt: "Porträt von Prof. Dr. Yawen Wang",
        shortBio:
          "Prof. Dr. Yawen Wang bringt ihre wissenschaftliche Expertise in unsere Kurskurierung ein und achtet auf Evidenzbasierung.",
      },
      {
        name: "Caméa Jamet",
        role: "Review-Board",
        imagePath:
          "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/team/camea.png",
        imageAlt: "Porträt von Caméa Jamet",
        shortBio:
          "Caméa Jamet begleitet EPHIA fachlich und achtet besonders auf Inklusivität und Diversität in unseren Kursinhalten.",
      },
      {
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
    heading: "Du möchtest Teil von EPHIA werden?",
    body: "Wir freuen uns über Initiativbewerbungen von Ärzt:innen und Menschen, die unsere Mission teilen. Schick uns einfach Deine Unterlagen per E-Mail.",
    email: "marc@ephia.de",
    bullets: [
      "Motivationsschreiben",
      "Lebenslauf (ohne Foto)",
    ],
  },
};
