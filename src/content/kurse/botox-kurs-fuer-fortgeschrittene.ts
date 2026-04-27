import type { CourseLandingContent } from "./types";
import { masterclassBotulinum } from "./masterclass-botulinum";

/**
 * Botox-Kurs für Fortgeschrittene — performance landing page on top
 * of the Masterclass Botulinum.
 *
 * Targets the search terms "Botox-Kurs für Fortgeschrittene", "Botox
 * Aufbaukurs", "Botox Masterclass", "Botulinum vertiefen". The
 * canonical Masterclass page (/kurse/masterclass-botulinum) cannot
 * use the word "Botox" per CI, so this is the only surface that can
 * rank for these queries.
 *
 * Re-uses the masterclass_botulinum Supabase template so the booking
 * widget shows real Masterclass dates, prices and prerequisite-
 * confirmation flow exactly like on the canonical page. Inhalt,
 * inhaltOnline, Lernplattform, hero video and Lernziele items are
 * inherited verbatim. ~30-40 % unique copy comes from hero,
 * lernziele intro, LearningPath, FAQ and testimonials.
 *
 * NOTE: Performance landing page, "Botox" wording is permitted per
 * CI. CME for the Praxiskurs component is currently "beantragt"; the
 * page is honest about this (no number is claimed).
 */
export const botoxKursFuerFortgeschrittene: CourseLandingContent = {
  slug: "botox-kurs-fuer-fortgeschrittene",
  // Same Supabase template as the Masterclass — booking widget pulls
  // real Masterclass dates and uses the same prerequisite-confirmation
  // flow for the standalone Praxiskurs.
  courseKey: "masterclass_botulinum",

  meta: {
    title: "Botox-Kurs für Fortgeschrittene, Masterclass Botulinum | EPHIA",
    description:
      "Botox-Kurs für Fortgeschrittene: Full Face Analyse, fortgeschrittene Injektionstechniken und Komplikationsmanagement auf Expert:innen-Niveau. Für approbierte Ärzt:innen mit regelmäßiger Botulinum-Praxis.",
    ogImage: "/kurse/masterclass_botulinum/og-image.jpg",
  },

  hero: {
    heading: "BOTOX-KURS FÜR\nFORTGESCHRITTENE",
    socialProof: "Für erfahrene Ärzt:innen mit regelmäßiger Botulinum-Praxis",
    ctaStacked: true,
    subheadline:
      "Full Face Analyse, fortgeschrittene Injektionstechniken und souveränes Komplikationsmanagement, für approbierte Ärzt:innen mit Botulinum-Erfahrung.",
    stats: [
      { icon: "Clock", label: "Format", value: "Online + Praxistag" },
      { icon: "Award", label: "Akkreditiert", value: "CME beantragt + Zertifikat" },
      { icon: "GraduationCap", label: "Level", value: "Fortgeschrittene" },
    ],
    description:
      "Unser Botox-Kurs für Fortgeschrittene richtet sich an Ärzt:innen, die bereits regelmäßig mit Botulinum behandeln und ihr Können auf Expert:innen-Niveau heben möchten. Im Fokus stehen die ganzheitliche Full Face Analyse, fortgeschrittene Injektionstechniken für komplexe Indikationen, mehrstufige Behandlungsstrategien und strukturiertes Komplikationsmanagement. Du behandelst unter 1:1-Anleitung erfahrener Dozent:innen direkt an Patient:innen, in einer kleinen Gruppe. Voraussetzung ist Deine Approbation sowie sicheres Handling der klassischen Indikationen (Stirn, Glabella, Lachfalten).",
    videoPath: masterclassBotulinum.hero.videoPath,
    videoPoster: masterclassBotulinum.hero.videoPoster,
  },

  lernziele: {
    heading: "LERNZIELE",
    intro:
      "Im Botox-Kurs für Fortgeschrittene vertiefst Du sechs Kompetenzfelder auf Expert:innen-Niveau und integrierst sie in Deinen Behandlungsalltag:",
    items: masterclassBotulinum.lernziele.items,
  },

  kursangeboteHeading: "UNSER KURSANGEBOT",

  gruppenbuchungen: {
    heading: "GRUPPENBUCHUNGEN",
    description:
      "Praxisteam aus erfahrenen Ärzt:innen, das gemeinsam fortgeschrittene Botulinum-Techniken vertiefen möchte? Gerne erstellen wir maßgeschneiderte Angebote für Dich und Deine Kolleg:innen. Sende uns dazu einfach eine Anfrage mit folgendem Inhalt: Anzahl Teilnehmer:innen (min. 4 Personen), gewünschter Kursinhalt, gewünschter Zeitraum.",
    ctaLabel: "Jetzt Anfrage senden",
    ctaHref:
      "mailto:customerlove@ephia.de?subject=Gruppenbuchung%20Botox-Kurs%20f%C3%BCr%20Fortgeschrittene",
  },

  inhalt: masterclassBotulinum.inhalt,
  inhaltOnline: masterclassBotulinum.inhaltOnline,

  learningPath: {
    heading: "DEIN LERNWEG",
    intro:
      "Vom Online-Modul über den Praxistag mit echten Patient:innen bis zur Integration in Deinen Behandlungsalltag, in drei Schritten zum sicheren Einsatz fortgeschrittener Botulinum-Techniken.",
    steps: [
      {
        number: 1,
        icon: "BookOpen",
        format: "Onlinekurs · ca. 10h",
        title: "Theorie auffrischen",
        description:
          "Vertiefte Anatomie der perioralen Zone, Full Face Analyse und fortgeschrittene Konzepte zur Behandlungsplanung. Inhaltsgleich mit dem Aufbaukurs Periorale Zone, falls Du den bereits absolviert hast, kannst Du direkt zum Praxistag.",
      },
      {
        number: 2,
        icon: "Users",
        format: "Praxistag · 1 Tag",
        title: "Full Face an Patient:innen",
        description:
          "Du behandelst echte Patient:innen mit komplexen Wünschen unter 1:1-Anleitung erfahrener Dozent:innen. Im Fokus stehen ganzheitliche Behandlungsstrategie, fortgeschrittene Injektionstechniken und strukturiertes Komplikationsmanagement.",
      },
      {
        number: 3,
        icon: "MessageCircleHeart",
        format: "Community · ab Tag 1",
        title: "Integration in Deinen Alltag",
        description:
          "Nach dem Kurs besprichst Du komplexe Fälle in unserer Ärzt:innen-Community, tauschst Dich mit Kolleg:innen aus und holst Dir Rückendeckung von Dozent:innen, wenn Du sie brauchst.",
      },
    ],
    prerequisites: {
      bringsHeading: "Was Du mitbringst",
      brings: [
        "Approbation als Ärzt:in",
        "Regelmäßige Botulinum-Behandlungen in Deiner Praxis",
        "Sicheres Handling der klassischen Indikationen (Stirn, Glabella, Lachfalten)",
        "Lust auf Full Face Denken und vertiefte Techniken",
      ],
      notRequiredHeading: "Was wir nicht voraussetzen",
      notRequired: [
        "Abschluss aller EPHIA-Aufbaukurse, vergleichbare Praxis genügt",
        "Vorherige Erfahrung mit komplexen Indikationen, lernen wir gemeinsam",
        "Eigene Patient:innen für den Praxistag, wir stellen Patient:innen",
        "Eine bestimmte Anzahl an Behandlungsjahren, relevant ist Dein aktueller Praxisstand",
      ],
    },
  },

  lernplattform: masterclassBotulinum.lernplattform,

  ctaBanner: {
    heading: "Bereit, Deine Botulinum-Skills auf Expert:innen-Niveau zu heben?",
    ctaLabel: "Termine sehen",
    ctaHref: "#kursangebote",
  },

  testimonials: {
    heading: "PRAXISSTIMMEN",
    // TODO Marc: replace with real Masterclass / Fortgeschrittene-Kurs
    // testimonials. Names below are placeholders.
    items: [
      {
        quote:
          "Ich habe hier die Full Face Analyse strukturiert gelernt. Vorher habe ich mich auf einzelne Zonen konzentriert, jetzt kann ich Patient:innen ganzheitlich beraten und Behandlungen über mehrere Sitzungen planen. Das hat meine Beratungsgespräche komplett verändert.",
        name: "Dr. Anna Schmidt",
        title: "Hausärztin mit ästhetischem Schwerpunkt",
      },
      {
        quote:
          "Was ich besonders schätze: die Live-Behandlungen an echten Patient:innen mit komplexen Wünschen. Bei ausgeprägter Asymmetrie oder hartnäckigen Falten habe ich vorher gezögert. Nach den 1:1-Korrekturen mit den Dozent:innen gehe ich auch komplexe Fälle ruhiger an.",
        name: "Stefan Kraus",
        title: "Allgemeinmedizin",
      },
      {
        quote:
          "Der Komplikationsmanagement-Teil war für mich der Aha-Moment. Klare Handlungspfade für Ptosis, Asymmetrien und vaskuläre Zwischenfälle, dokumentiert und durchgesprochen. Das gibt Sicherheit, die ich an meine Patient:innen weitergebe.",
        name: "Dr. Maria Hoffmann",
        title: "Dermatologie",
      },
    ],
  },

  faq: {
    heading: "FAQ",
    items: [
      {
        question:
          "Was ist der Unterschied zwischen Botox-Grundkurs, Aufbaukurs und Botox-Kurs für Fortgeschrittene?",
        answer:
          "Der Botox-Grundkurs vermittelt die theoretischen und praktischen Grundlagen für Einsteiger:innen mit klassischen Indikationen wie Stirn, Glabella und Lachfalten. Aufbaukurse vertiefen einzelne Anatomien (z.B. Aufbaukurs Lippen, Aufbaukurs Therapeutische Indikationen, Aufbaukurs Periorale Zone). Der Botox-Kurs für Fortgeschrittene entspricht unserer Masterclass Botulinum und hebt das Können auf Expert:innen-Niveau, ganzheitliche Full Face Analyse, fortgeschrittene Techniken für komplexe Indikationen und souveränes Komplikationsmanagement.",
      },
      {
        question:
          "Wie viel Vorerfahrung brauche ich für den Botox-Kurs für Fortgeschrittene?",
        answer:
          "Wir empfehlen, dass Du bereits regelmäßig mit Botulinum behandelst und die klassischen Indikationen (Stirn, Glabella, Lachfalten) sicher beherrschst. Idealerweise hast Du den EPHIA-Grundkurs sowie einen Aufbaukurs absolviert oder verfügst über vergleichbare Praxis. Eine bestimmte Anzahl an Behandlungsjahren ist nicht entscheidend, wichtiger ist Dein aktueller Praxisstand.",
      },
      {
        question:
          "Bekomme ich CME-Punkte für den Botox-Kurs für Fortgeschrittene?",
        answer:
          "Die CME-Akkreditierung für die Praxiskomponente ist aktuell bei der Ärztekammer Berlin beantragt. Der Onlinekurs (inhaltsgleich mit dem Aufbaukurs Botulinum Periorale Zone) ist mit 10 CME-Punkten eigenständig akkreditiert. Sobald die Praxis-CME bewilligt ist, reichen wir sie nach. Das EPHIA-Zertifikat über die erfolgreiche Teilnahme erhältst Du in jedem Fall.",
      },
      {
        question:
          "Brauche ich vorherige EPHIA-Aufbaukurse, um teilnehmen zu können?",
        answer:
          "Nein. Wir setzen kein vollständig durchlaufenes EPHIA-Curriculum voraus. Vergleichbare praktische Erfahrung mit Botulinum reicht aus. Im Praxisteil gehen wir davon aus, dass Du klassische Indikationen sicher beherrschst, sodass wir uns direkt auf fortgeschrittene Behandlungskonzepte konzentrieren können.",
      },
      {
        question:
          "Was unterscheidet den Praxistag vom Grundkurs-Praxistag?",
        answer:
          "Im Botox-Kurs für Fortgeschrittene behandelst Du echte Patient:innen mit komplexen Wünschen, nicht Proband:innen für klassische Indikationen. Der Fokus liegt auf der ganzheitlichen Full Face Analyse, mehrstufiger Behandlungsstrategie, fortgeschrittenen Injektionstechniken und strukturiertem Komplikationsmanagement. Du arbeitest direkt unter 1:1-Anleitung erfahrener Dozent:innen.",
      },
      // Inherit Probandin / Approbation / "direkt nach Kurs" / Probandin geeignet
      // entries from the canonical Masterclass page so the page covers
      // all the standard medical-landing-page questions without
      // duplicating my custom FAQ above (Vorerfahrung is already
      // covered by my own item, so we filter that one out).
      ...masterclassBotulinum.faq.items.filter(
        (item) =>
          !item.question.startsWith("Welche Vorerfahrung"),
      ),
    ],
  },

  breadcrumbLabel: "Botox-Kurs für Fortgeschrittene",
  relatedCourses: [
    "botox-kurs-fuer-aerzte",
    "botox-kurs-fuer-anfaenger",
    "botox-kurs-berlin",
  ],
};
