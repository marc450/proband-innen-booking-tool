"use client";

import React, { useState, useEffect } from "react";
import { CourseCard } from "./course-card";
import { PrerequisiteConfirmationDialog } from "./prerequisite-confirmation-dialog";
import { PremiumCard, BADGE_COLORS } from "./premium-card";
import type { IncludedCourse } from "./premium-card";
import type { CourseTemplate, CourseSession, CourseType } from "@/lib/types";

// Shared base for the Medizinische Hautpflege Onlinekurs so the modal
// looks identical on every package (Zahnmedizin, Dermalfiller, etc.).
// Only the pill colour varies per package.
const MEDIZINISCHE_HAUTPFLEGE: Omit<IncludedCourse, "badgeClasses"> = {
  name: "Grundkurs Medizinische Hautpflege",
  shortName: "Medizinische Hautpflege",
  type: "Onlinekurs",
  level: "Für alle Fachrichtungen",
  description: "In diesem Onlinekurs lernst Du als medizinische Fachperson die Grundkenntnisse in der Hautpflege, die in 19 Minuten in der Dermatologie und medizinischen Hautpflege vermittelt werden. Der Kurs bietet praxisrelevante Strategien in evidenzbasierter Weise, mit Fokus auf patientenorientierte Beratung.",
  cmePoints: "7",
  duration: "~4 Stunden",
  features: [
    "Grundlagen der Hautalterung",
    "Akne, Rosazea, periorale Dermatitis",
    "Aufbau einer nachhaltigen Pflegeroutine",
  ],
  lernziele: [
    "Hautphysiologie",
    "Skin of Color",
    "Störungen (Akne, Rosazea, etc.)",
    "Wirkstoffe",
    "Behandlungsoptionen",
    "Patient:innenkonsultation",
  ],
  kursinhalt: [
    "Begrüßung",
    "Grundlagen zur Haut",
    "Skin of Color",
    "Akne",
    "Rosazea",
    "Periorale Dermatitis",
    "Hautalterung",
    "Aufbau einer Pflegeroutine",
    "Myth Buster",
  ],
  inkludiert: [
    "9 online Lernkapitel",
    "Lehrvideos",
    "Ärzt:innen-Community",
    "1.5 Jahre Zugriff",
    "CME-Punkte",
    "Zertifikat",
  ],
};

// Zahnmedizin Komplettpaket: only includes the Hautpflege Onlinekurs
const ZAHNMEDIZIN_INCLUDED_COURSES: IncludedCourse[] = [
  { ...MEDIZINISCHE_HAUTPFLEGE, badgeClasses: BADGE_COLORS[2] },
];

// Lippen Komplettpaket: Aufbaukurs Lippen Online- & Praxiskurs (base)
// plus 3 Onlinekurse for a complete Dermalfiller + Skincare story:
// Onlinekurs Dermalfiller, Medizinische Hautpflege, Botulinum Periorale Zone.
const LIPPEN_INCLUDED_COURSES: IncludedCourse[] = [
  {
    name: "Grundkurs Dermalfiller — Onlinekurs",
    shortName: "Onlinekurs Dermalfiller",
    type: "Onlinekurs",
    level: "Einsteigerkurs",
    description:
      "Die theoretischen Grundlagen der Dermalfiller-Anwendung: Anatomie des Alterns, Produktkunde, Behandlungszonen im Mittelgesicht, Kommunikation und Komplikationsmanagement.",
    warning:
      "Der Onlinekurs Dermalfiller alleine ist keine ausreichende Grundlage für den Aufbaukurs Lippen. Wir empfehlen, vorher den Praxiskurs Dermalfiller zu absolvieren.",
    cmePoints: "11",
    duration: "~10 Stunden",
    features: [
      "Anatomie des Gesichts & des Alterns",
      "Produktkunde & Behandlungszonen",
      "Komplikationsmanagement",
    ],
    badgeClasses: BADGE_COLORS[0],
  },
  {
    ...MEDIZINISCHE_HAUTPFLEGE,
    // Override the pill label for this package so the three pills share
    // the "Onlinekurs …" prefix and read as a consistent set.
    shortName: "Onlinekurs Med. Hautpflege",
    badgeClasses: BADGE_COLORS[1],
  },
  {
    name: "Aufbaukurs Botulinum Periorale Zone, Onlinekurs",
    shortName: "Onlinekurs Periorale Zone",
    type: "Onlinekurs",
    level: "Aufbaukurs",
    description:
      "Vertiefe Deine Myomodulations-Skills für die sensible periorale Zone, fundiert, evidenzbasiert und praxisnah. Du lernst die relevante Anatomie, Indikationen und Produktwahl, spezifische Injektionstechniken für Lip Flip, Gummy Smile, Mundwinkel, Erdbeerkinn und Platysma sowie diskriminierungssensible Patient:innenkommunikation und Komplikationsmanagement.",
    cmePoints: "10",
    duration: "~10 Stunden",
    features: [
      "Gummy Smile & Lip Flip",
      "Mundwinkel & Erdbeerkinn",
      "Platysma (Nefertiti-Lift)",
    ],
    lernziele: [
      "Anatomie",
      "Indikationen",
      "Produktkenntnis",
      "Patient:innenkommunikation",
      "Technik",
      "Komplikationsmanagement",
    ],
    kursinhalt: [
      "Begrüßung & Kursüberblick",
      "Grundlagen",
      "Schönheitsideale & Hintergründe",
      "Anatomie der perioralen Zone",
      "Behandlung der Lippen mit Lip Flip",
      "Behandlung der Mundwinkel",
      "Behandlung des Erdbeerkinns",
      "Behandlung des Gummy Smiles",
      "Behandlung des Platysmas",
      "Myth Buster & Dispositionen & Fragen",
    ],
    inkludiert: [
      "Akkreditiert mit 10 CME-Punkten",
      "10 Online-Lernkapitel",
      "Lehrvideos zu jeder Indikation",
      "1.5 Jahre Zugriff (inkl. Updates)",
      "Ärzt:innen-Community",
      "EPHIA-Zertifikat nach Abschluss",
    ],
    badgeClasses: BADGE_COLORS[2],
  },
];

// Therapeutische Indikationen Komplettpaket: Online- & Praxiskurs
// (base) plus Onlinekurs Medizinische Hautpflege + Onlinekurs Grundkurs
// Botulinum. The Botulinum online course carries the same prerequisite
// warning as the Dermalfiller one in the Lippen package — the online
// theory alone is not a sufficient basis for the therapeutic Aufbaukurs.
const THERAPEUTISCHE_INDIKATIONEN_INCLUDED_COURSES: IncludedCourse[] = [
  {
    name: "Grundkurs Botulinum, Onlinekurs",
    shortName: "Onlinekurs Botulinum",
    type: "Onlinekurs",
    level: "Einsteigerkurs",
    description:
      "Die theoretischen Grundlagen der ästhetischen Botulinum-Anwendung: Anatomie der mimischen Muskulatur, Produktkunde, Behandlungszonen im oberen Gesichtsdrittel, diskriminierungssensible Beratung und Komplikationsmanagement. Klar strukturierte Behandlungsvideos zu jeder Indikation, abgestimmt auf CME-Testfragen am Kapitelende.",
    warning:
      "Der Onlinekurs Botulinum alleine ist keine ausreichende Grundlage für den Aufbaukurs Therapeutische Indikationen. Wir empfehlen, vorher den Praxiskurs Botulinum zu absolvieren.",
    cmePoints: "10",
    duration: "~10 Stunden",
    features: [
      "Anatomie der mimischen Muskulatur",
      "Produktkunde & Dosierung",
      "Komplikationsmanagement",
    ],
    lernziele: [
      "Anatomie",
      "Indikationen",
      "Produktkenntnis",
      "Patient:innenkommunikation",
      "Technik",
      "Komplikationsmanagement",
    ],
    kursinhalt: [
      "Begrüßung & Kursübersicht",
      "Grundlagen Botulinum",
      "Anatomie des Gesichts",
      "Schönheitsideale & Hintergründe",
      "Beratung & Aufklärung",
      "Vorbereitung einer Botulinum-Behandlung",
      "Mythen & andere Halbwahrheiten",
      "Behandlung der Stirn",
      "Behandlung der Glabella",
      "Behandlung der Krähenfüße",
      "Behandlung der Periorbitalregion",
      "Behandlung der Nase",
      "Komplikationen & Nebenwirkungen",
      "Offizielle Dokumente",
    ],
    inkludiert: [
      "Akkreditiert mit 10 CME-Punkten",
      "13 Online-Lernkapitel",
      "2+ Stunden Behandlungsvideos",
      "Vorlagen für Rechnungen",
      "Vorlagen für Patient:innen-Infos",
      "1.5 Jahre Zugriff (inkl. Updates)",
      "Ärzt:innen-Community",
      "EPHIA-Zertifikat nach Abschluss",
    ],
    badgeClasses: BADGE_COLORS[0],
  },
  {
    ...MEDIZINISCHE_HAUTPFLEGE,
    shortName: "Onlinekurs Med. Hautpflege",
    badgeClasses: BADGE_COLORS[1],
  },
];

// Dermalfiller Komplettpaket: Dermalfiller Online- & Praxiskurs (base)
// plus Medizinische Hautpflege + Aufbaukurs Lippen Onlinekurs.
// Only the two add-ons are listed here; the base course is the card headline.
// Lippen CME are currently pending LÄK Berlin approval.
const DERMALFILLER_INCLUDED_COURSES: IncludedCourse[] = [
  {
    name: "Aufbaukurs Lippen",
    shortName: "Onlinekurs Lippen",
    type: "Onlinekurs",
    level: "Aufbaukurs · setzt Grundkurs Dermalfiller voraus",
    description: "Vertiefe Deine Behandlungssicherheit in der perioralen Zone. Der Aufbaukurs Lippen deckt Anatomie, Indikationen, Produktwahl, Technik, Patient:innenkommunikation und Komplikationsmanagement ab, mit praxisnahen Behandlungsvideos und klaren Schritt-für-Schritt-Anleitungen.",
    cmePoints: "",
    cmePending: true,
    duration: "~5 Stunden",
    features: [
      "Anatomie der perioralen Zone",
      "Indikationen & Produktwahl",
      "Technik, Behandlungsvideos & Myth Buster",
    ],
    lernziele: [
      "Anatomie",
      "Indikationen",
      "Produktkenntnis",
      "Patient:innenkommunikation",
      "Technik",
      "Komplikationsmanagement",
    ],
    kursinhalt: [
      "Begrüßung",
      "Anatomie der perioralen Zone",
      "Indikationen & Wirkstoffe",
      "Beratung & Aufklärung",
      "Komplikation & Nachsorge",
      "Myth Buster",
      "Behandlungstechniken",
    ],
    inkludiert: [
      "CME-Punkte bei der LÄK Berlin beantragt",
      "Online Lernkapitel & Lehrvideos",
      "Ärzt:innen-Community",
      "1.5 Jahre Zugriff",
      "Zertifikat",
    ],
    badgeClasses: BADGE_COLORS[1],
  },
  { ...MEDIZINISCHE_HAUTPFLEGE, badgeClasses: BADGE_COLORS[2] },
];

interface Props {
  template: CourseTemplate;
  sessions: CourseSession[];
}

// Convert DB feature arrays to component format, with fallbacks
function toFeatures(dbFeatures: string[] | null, fallback: { text: string }[]): { text: string }[] {
  if (dbFeatures && dbFeatures.length > 0) {
    return dbFeatures.map((text) => ({ text }));
  }
  return fallback;
}

// Fallback features (used when DB has no features set)
const defaultOnlinekursFeatures = [
  { text: "Akkreditiert mit 10 CME-Punkten" },
  { text: "13 Lernkapitel" },
  { text: "2+ Stunden Behandlungsvideos" },
  { text: "Vorlagen für Rechnungen" },
  { text: "Vorlagen für Patient:innen-Infos" },
  { text: "1.5 Jahre Zugriff (inkl. Updates)" },
  { text: "Ärzt:innen-Community" },
];

const defaultPraxiskursFeatures = [
  { text: "Akkreditiert mit 12 CME-Punkten" },
  { text: "6+ Stunden gemeinsames Behandeln" },
  { text: "Üben an echten Proband:innen" },
  { text: "Erfahrene Dozent:innen-Aufsicht" },
  { text: "Max. 7 Teilnehmer:innen" },
];

const defaultKombikursFeatures = [
  { text: "Akkreditiert mit 22 CME-Punkten" },
  { text: "Vollständiger Onlinekurs inkludiert" },
  { text: "Vollständiger Praxiskurs inkludiert" },
];

function formatSessionLabel(session: CourseSession): string {
  let label = session.label_de || session.date_iso;

  if (session.start_time && session.duration_minutes) {
    const [h, m] = session.start_time.split(":").map(Number);
    const endMinutes = h * 60 + m + session.duration_minutes;
    const endH = String(Math.floor(endMinutes / 60)).padStart(2, "0");
    const endM = String(endMinutes % 60).padStart(2, "0");
    label = `${label} · ${session.start_time}–${endH}:${endM}`;
  }

  return label;
}

function getAvailability(session: CourseSession) {
  const remaining = session.max_seats - session.booked_seats;
  const available = remaining > 0;

  let availabilityTag: string | null = null;
  let availabilityLevel: "low" | "medium" | "ok" | "none" = "none";

  if (!available) {
    availabilityTag = "ausgebucht";
    availabilityLevel = "none";
  } else if (remaining === 1) {
    availabilityTag = "1 Platz frei";
    availabilityLevel = "low";
  } else if (remaining === 2) {
    availabilityTag = "2 Plätze frei";
    availabilityLevel = "medium";
  } else {
    availabilityTag = "2+ Plätze frei";
    availabilityLevel = "ok";
  }

  return { available, availabilityTag, availabilityLevel };
}

export function CourseCardsPage({ template, sessions: initialSessions }: Props) {
  const [sessions, setSessions] = useState(initialSessions);
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);
  // Pending Praxiskurs booking that's waiting on the prerequisite-confirmation
  // dialog. Holds the sessionId so we can resume the checkout when the user
  // confirms. Null when no confirmation flow is in progress.
  const [pendingPraxisBooking, setPendingPraxisBooking] = useState<string | null>(null);

  // Poll for session updates every 60 seconds
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/course-sessions?templateId=${template.id}`);
        if (res.ok) {
          const data = await res.json();
          setSessions(data.sessions);
        }
      } catch {
        // silently ignore polling errors
      }
    };

    const interval = setInterval(poll, 60_000);
    return () => clearInterval(interval);
  }, [template.id]);

  // Reset loading when user returns to page (after Stripe redirect)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setLoadingCheckout(null);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const dynamicDates = sessions.map((session) => {
    const { available, availabilityTag, availabilityLevel } = getAvailability(session);
    return {
      id: session.id,
      label: formatSessionLabel(session),
      available,
      availabilityTag,
      availabilityLevel,
    };
  });

  const redirectTo = (url: string) => {
    try {
      if (window.top && window.top !== window) {
        window.top.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch {
      window.location.href = url;
    }
  };

  const handleBooking = async (courseType: CourseType, sessionId?: string) => {
    const loadingKey = `${courseType}-${sessionId || "direct"}`;
    setLoadingCheckout(loadingKey);

    const timeoutId = setTimeout(() => setLoadingCheckout(null), 10_000);

    try {
      if (courseType !== "Onlinekurs" && !sessionId) {
        alert("Bitte wähle zuerst einen Termin.");
        clearTimeout(timeoutId);
        setLoadingCheckout(null);
        return;
      }

      const res = await fetch("/api/course-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseKey: template.course_key,
          courseType,
          sessionId: sessionId ?? null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        alert(data.error || "Fehler beim Starten des Checkouts.");
        clearTimeout(timeoutId);
        setLoadingCheckout(null);
        return;
      }

      redirectTo(data.url);
    } catch {
      alert("Unerwarteter Fehler beim Starten des Checkouts.");
      clearTimeout(timeoutId);
      setLoadingCheckout(null);
    }
  };

  const formatPrice = (amount: number | null) => {
    if (!amount) return "";
    return `EUR ${amount.toLocaleString("de-DE")}`;
  };

  // Course-specific overrides for header, descriptions and features
  const COURSE_OVERRIDES: Record<string, {
    header?: string;
    onlineDesc?: string | React.ReactNode;
    praxisDesc?: string | React.ReactNode;
    onlineFeatures?: { text: string }[];
    kombiFeatures?: { text: string }[];
    hasKomplettpaket?: boolean;
    hideCme?: boolean;
    // Hide the standalone Praxiskurs card on this landing page only.
    // The /courses/[courseKey] LearnWorlds embed and other surfaces are
    // unaffected — they read price_gross_praxis from the DB directly.
    hidePraxis?: boolean;
    /**
     * Optional warning rendered as an amber banner inside the standalone
     * Praxiskurs card (not the Kombikurs). Used to flag a hard
     * prerequisite. When set together with `praxisPrereqConfirm`, the
     * booking flow also opens a confirmation modal before checkout.
     */
    praxisWarning?: string;
    /**
     * When set, the standalone Praxiskurs booking flow opens a
     * prerequisite-confirmation dialog before kicking off Stripe. The
     * checkout only proceeds after the user explicitly ticks the
     * checkbox and confirms.
     */
    praxisPrereqConfirm?: {
      title?: string;
      description: string;
      checkboxLabel: string;
    };
  }> = {
    grundkurs_dermalfiller: {
      hidePraxis: true,
      hasKomplettpaket: true,
      kombiFeatures: [
        { text: "Akkreditiert mit 18 CME-Punkten" },
        { text: "Vollständiger Onlinekurs inkludiert" },
        { text: "6+ Stunden gemeinsames Behandeln" },
        { text: "Üben an echten Proband:innen" },
        { text: "Erfahrene Dozent:innen-Aufsicht" },
        { text: "Max. 5 Teilnehmer:innen" },
        { text: "Ärzt:innen-Community" },
      ],
    },
    grundkurs_medizinische_hautpflege: {
      // Online-only course — no Praxiskurs, no Komplettpaket card needed.
      hidePraxis: true,
      onlineDesc: "Dein fundierter Einstieg in die medizinische Hautpflege.",
    },
    aufbaukurs_therapeutische_indikationen_botulinum: {
      hidePraxis: true,
      hasKomplettpaket: true,
      kombiFeatures: [
        { text: "Akkreditiert mit 21 CME-Punkten" },
        { text: "Vollständiger Onlinekurs inkludiert" },
        { text: "6+ Stunden gemeinsames Behandeln" },
        { text: "Üben an echten Proband:innen" },
        { text: "Geübt wird mit BTX nicht NaCl" },
        { text: "Erfahrene Dozent:innen-Aufsicht" },
        { text: "Max. 7 Teilnehmer:innen" },
        { text: "EPHIA-Zertifikat nach Abschluss" },
      ],
    },
    aufbaukurs_lippen: {
      hidePraxis: true,
      hasKomplettpaket: true,
      kombiFeatures: [
        { text: "Vollständiger Onlinekurs inkludiert" },
        { text: "6+ Stunden gemeinsames Behandeln" },
        { text: "Üben an echten Proband:innen" },
        { text: "Erfahrene Dozent:innen-Aufsicht" },
        { text: "Max. 5 Teilnehmer:innen" },
        { text: "Ärzt:innen-Community" },
        { text: "EPHIA-Zertifikat nach Abschluss" },
      ],
      // CME for Lippen is still pending LÄK approval, so hide the numeric
      // CME badge everywhere until that changes.
      hideCme: true,
    },
    masterclass_botulinum: {
      praxisWarning:
        "Voraussetzung: abgeschlossener Onlinekurs Botulinum Periorale Zone.",
      praxisPrereqConfirm: {
        description:
          "Der Praxiskurs der Masterclass Botulinum baut auf dem Onlinekurs Botulinum Periorale Zone auf. Bitte bestätige, dass Du diesen bereits abgeschlossen hast, bevor Du den Praxiskurs buchst.",
        checkboxLabel:
          "Ich bestätige, dass ich den Onlinekurs Botulinum Periorale Zone bereits abgeschlossen habe.",
      },
    },
    grundkurs_botulinum_zahnmedizin: {
      header: "UNSERE KURSANGEBOTE FÜR ZAHNÄRZT:INNEN",
      onlineDesc: "Erlerne die Theorie zur Behandlung von Patient:innen mit Botulinum.",
      onlineFeatures: [
        { text: "13 Lernkapitel" },
        { text: "2+ Stunden Behandlungsvideos" },
        { text: "Vorlagen für Rechnungen" },
        { text: "Vorlagen für Patient:innen-Infos" },
        { text: "1.5 Jahre Zugriff (inkl. Updates)" },
        { text: "Ärzt:innen-Community" },
      ],
      kombiFeatures: [
        { text: "Vollständiger Onlinekurs inkludiert" },
        { text: "6+ Stunden gemeinsames Behandeln" },
        { text: "Üben an echten Proband:innen" },
        { text: "Üben mit Botulinum anstelle NaCl" },
        { text: "Erfahrene Dozent:innen-Aufsicht" },
        { text: "Max. 7 Teilnehmer:innen" },
        { text: "Ärzt:innen-Community" },
      ],
      hasKomplettpaket: true,
      hideCme: true,
    },
  };

  const overrides = COURSE_OVERRIDES[template.course_key || ""] || {};
  const pageHeader = overrides.header || "UNSERE KURSANGEBOTE";
  const onlineDescription = overrides.onlineDesc || "Erlerne die praxisnahe Theorie zur professionellen Behandlung von Patient:innen.";

  return (
    <section id="kursangebote" className="py-16 md:py-24 px-4 scroll-mt-24 md:scroll-mt-28" style={{ backgroundColor: "#0066FF" }}>
      <div className="max-w-7xl mx-auto">
        <h2
          className="text-3xl md:text-4xl font-bold text-center mb-14 tracking-wide"
          style={{ color: "#fff" }}
        >
          {pageHeader}
        </h2>

        {(() => {
          const isPremiumLayout = template.course_key === "grundkurs_botulinum";
          const hasOnline = !!template.price_gross_online;
          const hasPraxis = !!template.price_gross_praxis;
          const hasKombi = !!template.price_gross_kombi;

          // Resolve features from DB, falling back to defaults.
          // For grundkurs_botulinum (Humanmedizin): strip "EPHIA-Zertifikat nach Abschluss"
          // and replace with "Ärzt:innen-Community". All other courses keep Zertifikat.
          const rawOnline = toFeatures(template.features_online, defaultOnlinekursFeatures);
          const rawPraxis = toFeatures(template.features_praxis, defaultPraxiskursFeatures);
          const rawKombi = toFeatures(template.features_kombi, defaultKombikursFeatures);

          let onlineFeatures: { text: string }[];
          let praxisFeatures: { text: string }[];
          let kombiFeatures: { text: string }[];

          if (isPremiumLayout) {
            // Humanmedizin: strip Zertifikat, add Community as replacement
            const hadZertifikat = rawOnline.some((f) => f.text === "EPHIA-Zertifikat nach Abschluss");
            onlineFeatures = rawOnline.filter((f) => f.text !== "EPHIA-Zertifikat nach Abschluss");
            if (hadZertifikat && !onlineFeatures.some((f) => f.text === "Ärzt:innen-Community")) {
              onlineFeatures.push({ text: "Ärzt:innen-Community" });
            }
            praxisFeatures = rawPraxis.filter((f) => f.text !== "EPHIA-Zertifikat nach Abschluss");
            kombiFeatures = rawKombi.filter((f) => f.text !== "EPHIA-Zertifikat nach Abschluss");
          } else if (overrides.onlineFeatures) {
            // Course has explicit online feature override
            onlineFeatures = overrides.onlineFeatures;
            praxisFeatures = rawPraxis;
            kombiFeatures = rawKombi;
            if (!kombiFeatures.some((f) => f.text === "EPHIA-Zertifikat nach Abschluss")) {
              kombiFeatures.push({ text: "EPHIA-Zertifikat nach Abschluss" });
            }
          } else {
            // All other courses: keep features as-is, ensure Zertifikat is present
            onlineFeatures = rawOnline;
            if (!onlineFeatures.some((f) => f.text === "EPHIA-Zertifikat nach Abschluss")) {
              onlineFeatures.push({ text: "EPHIA-Zertifikat nach Abschluss" });
            }
            praxisFeatures = rawPraxis;
            kombiFeatures = rawKombi;
            if (!kombiFeatures.some((f) => f.text === "EPHIA-Zertifikat nach Abschluss")) {
              kombiFeatures.push({ text: "EPHIA-Zertifikat nach Abschluss" });
            }
          }

          if (isPremiumLayout) {
            // grundkurs_botulinum only: hardcoded override so the Praxiskurs card
            // shows "Vollständiger Onlinekurs inkludiert" / "Vollständiger Praxiskurs inkludiert"
            // regardless of what's stored in course_templates.features_kombi.
            const premiumKombiFeatures = kombiFeatures
              .map((f) => {
                if (f.text === "Vollständiger Onlinekurs" || f.text === "Vollständiger Onlinekurs inkludiert") {
                  return { text: "Vollständiger Onlinekurs inkludiert" };
                }
                if (f.text === "Vollständiger Praxiskurs" || f.text === "Vollständiger Praxiskurs inkludiert") {
                  return { text: "Vollständiger Praxiskurs inkludiert" };
                }
                return f;
              });

            // Grundkurs Botulinum: Onlinekurs, Kombikurs, Premium Starterpaket
            return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {hasOnline && (
                  <CourseCard
                    title="Onlinekurs"
                    description={onlineDescription}
                    price={formatPrice(template.price_gross_online)}
                    features={onlineFeatures}
                    bookingType="direct"
                    buttonText="Onlinekurs buchen"
                    onBook={() => handleBooking("Onlinekurs")}
                    isLoading={loadingCheckout === "Onlinekurs-direct"}
                    cmePoints={template.cme_online || undefined}
                    titleClassName="text-[1.75rem]"
                  />
                )}

                {hasKombi && (
                  <CourseCard
                    title="Online- & Praxiskurs"
                    description="Lerne die theoretischen Grundlagen online und die Praxis vor Ort an Proband:innen."
                    price={formatPrice(template.price_gross_kombi)}
                    features={premiumKombiFeatures}
                    bookingType="dropdown"
                    dates={dynamicDates}
                    buttonText="Online- & Praxiskurs buchen"
                    additionalInfo="Praxiskurs-Standort: Berlin-Mitte"
                    onBook={(sessionId) => handleBooking("Kombikurs", sessionId)}
                    isLoading={loadingCheckout?.startsWith("Kombikurs-") || false}
                    selectedDateForLoading={loadingCheckout?.replace("Kombikurs-", "")}
                    cmePoints={template.cme_kombi || undefined}
                    inclusionHeading="Im Online- & Praxiskurs inkludiert:"
                    titleClassName="text-[1.75rem] whitespace-nowrap"
                  />
                )}

                <PremiumCard
                  dates={dynamicDates}
                  onBook={(sessionId) => handleBooking("Premium", sessionId)}
                  isLoading={loadingCheckout?.startsWith("Premium-") || false}
                  selectedDateForLoading={loadingCheckout?.replace("Premium-", "")}
                />
              </div>
            );
          }

          // Default layout for all other courses.
          // Dermalfiller uses a hardcoded price below, so the DB price
          // gate is bypassed when the override explicitly sets the flag.
          const isDermalfiller = template.course_key === "grundkurs_dermalfiller";
          const isLippen = template.course_key === "aufbaukurs_lippen";
          const isTherapeutischeIndikationen =
            template.course_key === "aufbaukurs_therapeutische_indikationen_botulinum";
          const hasKomplettpaket =
            !!overrides.hasKomplettpaket &&
            (!!template.price_gross_premium || isDermalfiller || isLippen || isTherapeutischeIndikationen);
          const showPraxis = hasPraxis && !overrides.hidePraxis;
          const cardCount = [hasOnline, showPraxis, hasKombi, hasKomplettpaket].filter(Boolean).length;
          const gridCols = cardCount === 1 ? "lg:grid-cols-1 max-w-lg mx-auto" : cardCount === 2 ? "lg:grid-cols-2 max-w-4xl mx-auto" : "lg:grid-cols-3";

          // Ensure kombi features show "inkludiert" suffix consistently
          const defaultKombi = kombiFeatures.map((f) => {
            if (f.text === "Vollständiger Onlinekurs" || f.text === "Vollständiger Onlinekurs inkludiert") {
              return { text: "Vollständiger Onlinekurs inkludiert" };
            }
            if (f.text === "Vollständiger Praxiskurs" || f.text === "Vollständiger Praxiskurs inkludiert") {
              return { text: "Vollständiger Praxiskurs inkludiert" };
            }
            return f;
          });

          return (
            <div className={`grid grid-cols-1 ${gridCols} gap-8`}>
              {hasOnline && (
                <CourseCard
                  title="Onlinekurs"
                  description={onlineDescription}
                  price={formatPrice(template.price_gross_online)}
                  features={onlineFeatures}
                  bookingType="direct"
                  buttonText="Onlinekurs buchen"
                  onBook={() => handleBooking("Onlinekurs")}
                  isLoading={loadingCheckout === "Onlinekurs-direct"}
                  cmePoints={overrides.hideCme ? undefined : (template.cme_online || undefined)}
                />
              )}

              {showPraxis && (
                <CourseCard
                  title="Praxiskurs"
                  description={
                    <>
                      Wende Dein <strong className="font-bold">bereits existierendes</strong> theoretisches
                      Wissen in der Praxis an.
                    </>
                  }
                  price={formatPrice(template.price_gross_praxis)}
                  features={praxisFeatures}
                  bookingType="dropdown"
                  dates={dynamicDates}
                  buttonText="Praxiskurs buchen"
                  additionalInfo="Praxiskurs-Standort: Berlin-Mitte"
                  warning={overrides.praxisWarning}
                  onBook={(sessionId) => {
                    // If this course has a prerequisite-confirmation flow
                    // configured, intercept and stash the sessionId until
                    // the user confirms in the modal.
                    if (overrides.praxisPrereqConfirm && sessionId) {
                      setPendingPraxisBooking(sessionId);
                      return;
                    }
                    handleBooking("Praxiskurs", sessionId);
                  }}
                  isLoading={loadingCheckout?.startsWith("Praxiskurs-") || false}
                  selectedDateForLoading={loadingCheckout?.replace("Praxiskurs-", "")}
                  cmePoints={overrides.hideCme ? undefined : (template.cme_praxis || undefined)}
                />
              )}

              {hasKombi && (
                <CourseCard
                  title="Online- & Praxiskurs"
                  description="Lerne die theoretischen Grundlagen online und die Praxis vor Ort an Proband:innen."
                  price={formatPrice(template.price_gross_kombi)}
                  features={overrides.kombiFeatures || defaultKombi}
                  bookingType="dropdown"
                  dates={dynamicDates}
                  buttonText="Online- & Praxiskurs buchen"
                  additionalInfo="Praxiskurs-Standort: Berlin-Mitte"
                  onBook={(sessionId) => handleBooking("Kombikurs", sessionId)}
                  highlighted={!hasKomplettpaket}
                  isLoading={loadingCheckout?.startsWith("Kombikurs-") || false}
                  selectedDateForLoading={loadingCheckout?.replace("Kombikurs-", "")}
                  cmePoints={overrides.hideCme ? undefined : (template.cme_kombi || undefined)}
                  inclusionHeading="Im Online- & Praxiskurs inkludiert:"
                  titleClassName="text-[1.75rem] whitespace-nowrap"
                />
              )}

              {hasKomplettpaket && isDermalfiller && (
                <PremiumCard
                  dates={dynamicDates}
                  onBook={(sessionId) => handleBooking("Premium", sessionId)}
                  isLoading={loadingCheckout?.startsWith("Premium-") || false}
                  selectedDateForLoading={loadingCheckout?.replace("Premium-", "")}
                  description="Das Paket für Deinen selbstbewussten Start in das Thema Dermalfiller: 1 Praxiskurs + 3 Onlinekurse."
                  price="EUR 1.827"
                  originalPrice="EUR 2.030"
                  discountLabel=""
                  cmeTotal="25"
                  includedCourses={DERMALFILLER_INCLUDED_COURSES}
                  extraFeatures={["Ärzt:innen-Community"]}
                />
              )}

              {hasKomplettpaket && isLippen && (
                <PremiumCard
                  dates={dynamicDates}
                  onBook={(sessionId) => handleBooking("Premium", sessionId)}
                  isLoading={loadingCheckout?.startsWith("Premium-") || false}
                  selectedDateForLoading={loadingCheckout?.replace("Premium-", "")}
                  description="Deine umfassende Expertise für die periorale Zone: 1 Praxiskurs + 3 Onlinekurse."
                  // Price: Lippen Kombi (1.140) + Onlinekurs Dermalfiller
                  // (490) + Hautpflege (250) + Periorale Zone (340) = 2.220.
                  // -10% bundle discount = 1.998.
                  price="EUR 1.998"
                  originalPrice="EUR 2.220"
                  discountLabel=""
                  // Sum of included online-course CME points: Dermalfiller
                  // (11) + Hautpflege (7) + Periorale Zone (4) = 22. Lippen
                  // itself is still pending LÄK accreditation so it doesn't
                  // contribute yet.
                  cmeTotal="22"
                  includedCourses={LIPPEN_INCLUDED_COURSES}
                />
              )}

              {hasKomplettpaket && isTherapeutischeIndikationen && (
                <PremiumCard
                  dates={dynamicDates}
                  onBook={(sessionId) => handleBooking("Premium", sessionId)}
                  isLoading={loadingCheckout?.startsWith("Premium-") || false}
                  selectedDateForLoading={loadingCheckout?.replace("Premium-", "")}
                  description="Für Deinen sicheren Einstieg in die therapeutischen Indikationen: 1 Praxiskurs + 2 Onlinekurse."
                  // Price: Therap. Kombi (1.140) + Onlinekurs Botulinum
                  // (490) + Hautpflege (250) = 1.880. -10% bundle = 1.692.
                  price="EUR 1.692"
                  originalPrice="EUR 1.880"
                  discountLabel=""
                  // 21 (Kombi) + 10 (Botulinum online) + 7 (Hautpflege) = 38
                  cmeTotal="38"
                  includedCourses={THERAPEUTISCHE_INDIKATIONEN_INCLUDED_COURSES}
                />
              )}

              {hasKomplettpaket && !isDermalfiller && !isLippen && !isTherapeutischeIndikationen && (
                <PremiumCard
                  dates={dynamicDates}
                  onBook={(sessionId) => handleBooking("Premium", sessionId)}
                  isLoading={loadingCheckout?.startsWith("Premium-") || false}
                  selectedDateForLoading={loadingCheckout?.replace("Premium-", "")}
                  description="Dein Komplettpaket: Online- & Praxiskurs Botulinum plus Onlinekurs Medizinische Hautpflege."
                  price="EUR 1.490"
                  originalPrice="EUR 1.540"
                  discountLabel=""
                  cmeTotal=""
                  includedCourses={ZAHNMEDIZIN_INCLUDED_COURSES}
                />
              )}
            </div>
          );
        })()}

      </div>

      {/* Prerequisite-confirmation dialog. Mounted once at the section
          level so it can intercept any standalone Praxiskurs booking on
          courses that opt in via `praxisPrereqConfirm`. The pending
          sessionId is stashed in `pendingPraxisBooking` while the user
          decides; on confirm we resume the normal checkout flow. */}
      {overrides.praxisPrereqConfirm && (
        <PrerequisiteConfirmationDialog
          open={!!pendingPraxisBooking}
          title={overrides.praxisPrereqConfirm.title}
          description={overrides.praxisPrereqConfirm.description}
          checkboxLabel={overrides.praxisPrereqConfirm.checkboxLabel}
          onCancel={() => setPendingPraxisBooking(null)}
          onConfirm={() => {
            const sessionId = pendingPraxisBooking;
            setPendingPraxisBooking(null);
            if (sessionId) handleBooking("Praxiskurs", sessionId);
          }}
        />
      )}
    </section>
  );
}
