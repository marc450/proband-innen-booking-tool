import type { HomeContent } from "./home-types";

/**
 * Home page content for kurse.ephia.de (shadow marketing site).
 *
 * Most course tiles currently link out to the live LearnWorlds pages on
 * www.ephia.de. As shadow pages replace them, swap the `href` to an
 * internal path (e.g. "/grundkurs-botulinum").
 */
export const homeContent: HomeContent = {
  meta: {
    title: "EPHIA — Akademie für ästhetische Medizin",
    description:
      "Deine Lernplattform für inklusive ästhetische Medizin. LÄK-zertifizierte Lehrgänge, On- & Offlinekurse und eine aktive Ärzt:innen-Community.",
    ogImage: "/kurse/home/og-image.jpg",
  },

  hero: {
    heading: "Deine Lernplattform für inklusive ästhetische Medizin",
    checklist: [
      { text: "LÄK-zertifizierte Lehrgänge" },
      { text: "On- & Offlinekurse" },
      { text: "Aktive Ärzt:innen-Community" },
    ],
    ctaLabel: "Zu unseren Kursen ↓",
    ctaHref: "#unsere-kurse",
    imagePath: "/kurse/home/hero.jpg",
    imageAlt: "Drei Ärzt:innen im warmen Sonnenlicht",
  },

  werWirSind: {
    heading: "WER WIR SIND",
    subheading: "„Ästhetische Medizin neu denken.\"",
    videoPath:
      "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/home/wer-wir-sind-web.mp4?v=2",
    personName: "Dr. Sophia Wilk-Vollmann",
    personTitle: "Gründerin von EPHIA",
  },

  courses: {
    heading: "UNSERE KURSE",
    intro:
      "Grundkurse sind Einstiegskurse für Kurseinsteiger:innen. Aufbaukurse brauchen ein solides medizinisches Basiswissen vor der Kursteilnahme.",
    tiles: [
      {
        kicker: "GRUNDKURS",
        title: "BOTULINUM",
        audience: "Für Humanmediziner:innen",
        description:
          "Dein Grundkurs rund um das approbierte Humanmedizinwissen: In erster Linie in der Behandlung von Patient:innen mit Botulinum. Behandelt werden die Grundlagen der ästhetischen Botulinum-Behandlung und fundamentale Lernziele, die jede:r Ärzt:in in der Facharztausbildung erlernen sollte.",
        imagePath: "/kurse/grundkurs_botulinum/og-image.jpg",
        imageAlt: "Grundkurs Botulinum für Humanmediziner:innen",
        ctaLabel: "Zu den Kursdetails",
        href: "/grundkurs-botulinum",
      },
      {
        kicker: "GRUNDKURS",
        title: "BOTULINUM",
        audience: "Für Zahnmediziner:innen",
        description:
          "Dein Grundkurs rund um das approbierte Zahnmedizinwissen: In erster Linie in der Behandlung von Patient:innen mit Botulinum. Lerne die Grundlagen der ästhetischen Botulinum-Behandlung kennen, speziell zugeschnitten auf Zahnärzt:innen.",
        imagePath: "/kurse/grundkurs_botulinum/og-image.jpg",
        imageAlt: "Grundkurs Botulinum für Zahnmediziner:innen",
        ctaLabel: "Zu den Kursdetails",
        href: "https://www.ephia.de/grundkurs-botulinum-zahnmedizin",
      },
      {
        kicker: "GRUNDKURS",
        title: "DERMALFILLER",
        audience: "Für Kurseinsteiger:innen",
        description:
          "Dieser Grundkurs richtet sich an approbierte Ärzt:innen, die eine Einführung in die Behandlung von Patient:innen mit dermalen Fillern suchen. Wir konzentrieren uns auf die Grundlagen der Dermalfiller-Behandlung, die Behandlungsmöglichkeiten und die Sicherheit in der Gesichtsanatomie.",
        imagePath: "/kurse/home/grundkurs-dermalfiller.jpg",
        imageAlt: "Grundkurs Dermalfiller",
        ctaLabel: "Zu den Kursdetails",
        href: "https://www.ephia.de/grundkurs-dermalfiller",
      },
      {
        kicker: "AUFBAUKURS",
        title: "Sculptra & Skinbooster",
        audience: "Für fortgeschrittene Ärzt:innen",
        description:
          "Dieser Aufbaukurs richtet sich an approbierte Ärzt:innen, die Ihre Kenntnisse in der Behandlung mit Sculptra und Skinboostern ausbauen möchten. Wir bauen auf die Grundkurse auf und vertiefen die praktische Anwendung moderner Injektionsverfahren sowie den Einsatz bei biomedizinischen Indikationen.",
        imagePath: "/kurse/home/aufbaukurs-sculptra-skinbooster.jpg",
        imageAlt: "Aufbaukurs Sculptra & Skinbooster",
        ctaLabel: "Zu den Kursdetails",
        href: "https://www.ephia.de/aufbaukurs-sculptra-skinbooster",
      },
      {
        kicker: "GRUNDKURS",
        title: "MED. HAUTPFLEGE",
        audience: "Für Kurseinsteiger:innen",
        description:
          "Der Grundkurs Medizinische Hautpflege vermittelt Dir das approbierte Ärzt:innenwissen für die richtige Beratung und Verordnung von ärztlich unterstützter Hautpflege. Lerne die Grundlagen der dermatologisch relevanten Hautdiagnostik, den Aufbau der Haut und den individuellen Pflegeanspruch Deiner Patient:innen kennen.",
        imagePath: "/kurse/home/grundkurs-medizinische-hautpflege.jpg",
        imageAlt: "Grundkurs Medizinische Hautpflege",
        ctaLabel: "Zu den Kursdetails",
        href: "https://www.ephia.de/grundkurs-medizinische-hautpflege",
      },
      {
        kicker: "AUFBAUKURS",
        title: "BOTULINUM",
        audience: "Therapeutische Indikationen",
        description:
          "Dieser Aufbaukurs richtet sich an approbierte Ärzt:innen, die Ihre Kenntnisse in der therapeutischen Behandlung mit Botulinum ausbauen möchten. Wir bauen auf die Grundkurse auf und vertiefen die medizinisch-therapeutischen Anwendungsgebiete und spezielle Behandlungstechniken für Funktionsstörungen und Schmerzsyndrome.",
        imagePath: "/kurse/home/aufbaukurs-botulinum-therapeutisch.jpg",
        imageAlt: "Aufbaukurs Botulinum Therapeutische Indikationen",
        ctaLabel: "Zu den Kursdetails",
        href: "https://www.ephia.de/aufbaukurs-botulinum-therapeutische-indikationen",
      },
      {
        kicker: "AUFBAUKURS",
        title: "BOTULINUM",
        audience: "Periorale Zone",
        description:
          "Dieser Aufbaukurs richtet sich an approbierte Ärzt:innen, die Ihre Kenntnisse in der Behandlung der perioralen Zone mit Botulinum vertiefen möchten. Du lernst die sichere, evidenzbasierte Behandlung des Mundbereichs mit präzisen Techniken, inklusive Anatomie, Indikationen und Komplikationsmanagement.",
        imagePath: "/kurse/home/aufbaukurs-botulinum-periorale-zone.jpg",
        imageAlt: "Aufbaukurs Botulinum Periorale Zone",
        ctaLabel: "Zu den Kursdetails",
        href: "https://www.ephia.de/aufbaukurs-botulinum-periorale-zone",
      },
      {
        kicker: "GRUPPENBUCHUNGEN",
        title: "GRUPPENBUCHUNGEN",
        audience: "Für private Kurse",
        description:
          "Wir erstellen Dir gerne maßgeschneiderte Kursprogramme speziell für Dein Praxisteam oder Dein Netzwerk. Beantworte ein paar Fragen zu Gruppengröße, Wunschkursinhalt und Zeitraum, und wir schicken Dir umgehend ein Angebot für Eure Weiterbildung zu.",
        ctaLabel: "Jetzt Anfrage senden",
        type: "group-inquiry",
      },
    ],
  },

  fokus: {
    heading: "UNSER FOKUS",
    items: [
      {
        icon: "GraduationCap",
        title: "Fachlich & didaktisch hochwertige Ausbildung",
        href: "https://www.ephia.de/unsere-didaktik",
        ctaLabel: "Mehr erfahren",
      },
      {
        icon: "Heart",
        title: "Patient:innenzentrierte, inklusive Medizin",
        href: "https://www.ephia.de/unsere-vision",
        ctaLabel: "Mehr erfahren",
      },
      {
        icon: "Users",
        title: "Förderung unserer Ärzt:innen-Community",
        href: "https://www.ephia.de/community",
        ctaLabel: "Mehr erfahren",
      },
    ],
  },

  testimonials: {
    heading: "#wearetogether",
    subheading: "Was durch uns ausgebildete Ärzt:innen sagen",
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

  instagram: {
    heading: "NEWSLETTER SIND VON GESTERN",
    subheading: "Folge uns einfach auf Insta!",
    widgetId: "6fbfcc53812a55ec9db620f1a9d278b6",
  },
};
