/**
 * Hardcoded course detail content for curriculum cards.
 * Used in the accordion sections of the curriculum landing page.
 */

export interface CurriculumCourseContent {
  /** Base course title (e.g. "Grundkurs Botulinum") */
  title: string;
  /** Learning goals */
  lernziele: string[];
  /** What's included in the Onlinekurs */
  onlinekursFeatures: string[];
  /** What's included in the Praxiskurs (null for online-only courses) */
  praxiskursFeatures: string[] | null;
  /** Link to the full ephia.de landing page */
  landingPage: string;
}

export const CURRICULUM_COURSE_CONTENT: Record<string, CurriculumCourseContent> = {
  grundkurs_botulinum: {
    title: "Grundkurs Botulinum",
    lernziele: [
      "Wichtige anatomische Grundlagen der Gesichtsmuskulatur",
      "Sicherheit in Indikationsstellung, Kontraindikationen und Patient:innenberatung",
      "Verschiedene Präparate: Aufbereitung, Zulassung und Unterschiede",
      "Diskriminierungssensible Kommunikation und patient:innenzentriertes Handeln",
      "Grenzen von Botulinum, ganzheitliche und individuelle Behandlung",
      "Strategien für den Umgang mit Komplikationen",
    ],
    onlinekursFeatures: [
      "Ca. 10 Stunden Selbststudium",
      "13 Lernkapitel mit Fortschrittsanzeige",
      "2+ Stunden Behandlungsvideos an echten Patient:innen",
      "Vorlagen für Rechnungen und Patient:innen-Infos",
      "1,5 Jahre Zugriff inkl. Updates",
    ],
    praxiskursFeatures: [
      "6+ Stunden gemeinsames Behandeln",
      "Üben an echten Proband:innen mit Botulinum",
      "Erfahrene Dozent:innen-Aufsicht",
      "Max. 7 Teilnehmer:innen",
      "Standort: Berlin-Mitte",
    ],
    landingPage: "https://www.ephia.de/grundkurs-botulinum",
  },

  grundkurs_medizinische_hautpflege: {
    title: "Grundkurs medizinische Hautpflege",
    lernziele: [
      "Anatomischer Aufbau und physiologische Funktionen der Haut",
      "Grundlagen zu Skin of Color in Hautpflege und Beratung",
      "Häufigste dermatologische Krankheitsbilder mit ästhetischer Relevanz",
      "Überblick über Wirkstoffe und Produkte, die medizinisch wirksam sind",
      "Individualisierte Hautpflegekonzepte für Patient:innen erstellen",
    ],
    onlinekursFeatures: [
      "Jedes Kapitel mit präzisen Lernzielen",
      "CME-Testfragen am Kapitelende",
      "Alle Inhalte direkt praxisrelevant",
      "Für med. Fachpersonal mit Grundkenntnissen in Hautphysiologie",
    ],
    praxiskursFeatures: null,
    landingPage: "https://www.ephia.de/grundkurs-medizinische-hautpflege",
  },

  aufbaukurs_therapeutische_indikationen_botulinum: {
    title: "Aufbaukurs Therapeutische Indikationen",
    lernziele: [
      "Therapeutische Anwendung bei Bruxismus, chronischer Migräne, muskulären Verspannungen und Hyperhidrose",
      "Vertiefte anatomische Grundlagen für therapeutische Indikationen",
      "Präparate für spezifische therapeutische Anwendungen",
      "Diagnostik, Patient:innenaufklärung und Dokumentation",
      "Komplikationsmanagement bei therapeutischen Indikationen",
    ],
    onlinekursFeatures: [
      "Ca. 10 Stunden Selbststudium",
      "Praxisnahe Videosequenzen zu jeder Indikation",
      "Korrekte Anzeichnung der Injektionspunkte am Modell",
      "Live-Behandlungsschritte an Patient:innen",
    ],
    praxiskursFeatures: [
      "Hands-on Training unter Aufsicht",
      "Üben an echten Proband:innen mit Botulinum",
      "Therapeutische Indikationen in der Praxis vertiefen",
      "Erfahrene Dozent:innen-Begleitung",
      "Standort: Berlin-Mitte",
    ],
    landingPage: "https://www.ephia.de/aufbaukurs-therapeutische-indikationen",
  },

  masterclass_botulinum: {
    title: "Masterclass Botulinum",
    lernziele: [
      "Fortgeschrittene anatomische Grundlagen",
      "Vertiefung der Indikationsstellung und Kontraindikationen",
      "Fortgeschrittene Injektionstechniken",
      "Komplikationsmanagement auf Expert:innen-Niveau",
    ],
    onlinekursFeatures: [
      "Videobasierte Instruktion auf Expert:innen-Niveau",
      "Selbstgesteuertes Lernen",
      "Austausch mit Dozierenden in der Community",
    ],
    praxiskursFeatures: [
      "Praktische Hands-on Komponente",
      "Fortgeschrittene Techniken am echten Fall",
      "Erfahrene Dozent:innen-Begleitung",
      "Standort: Berlin-Mitte",
    ],
    landingPage: "https://www.ephia.de/masterclass-botulinum",
  },
};
