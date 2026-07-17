"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CourseCard } from "./course-card";
import { PrerequisiteConfirmationDialog } from "./prerequisite-confirmation-dialog";
import { PremiumCard, BADGE_COLORS } from "./premium-card";
import type { IncludedCourse } from "./premium-card";
import type { CourseTemplate, CourseSession, CourseType } from "@/lib/types";
import { getCurriculumForCourseKey } from "@/lib/curricula";
import { getGa4Ids } from "@/lib/ga-client";
import { toCourseDate } from "@/lib/course-dates";

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
// Lippen Onlinekurs jetzt mit 11 CME akkreditiert (Praxiskurs separat
// 13 CME, gesamt 24 CME — Marc-Bestätigung 2026-05-31).
const DERMALFILLER_INCLUDED_COURSES: IncludedCourse[] = [
  {
    name: "Aufbaukurs Dermalfiller: Lippen",
    shortName: "Onlinekurs Lippen",
    type: "Onlinekurs",
    level: "Aufbaukurs · setzt Grundkurs Dermalfiller voraus",
    description: "Vertiefe Deine Behandlungssicherheit in der perioralen Zone. Der Aufbaukurs Lippen deckt Anatomie, Indikationen, Produktwahl, Technik, Patient:innenkommunikation und Komplikationsmanagement ab, mit praxisnahen Behandlungsvideos und klaren Schritt-für-Schritt-Anleitungen.",
    cmePoints: "11",
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
      "11 CME-Punkte (Onlineteil)",
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

export function CourseCardsPage({ template, sessions: initialSessions }: Props) {
  const [sessions, setSessions] = useState(initialSessions);
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);
  // Banner shown above the cards when /api/course-checkout fails. The
  // children (CourseCard, PremiumCard) handle their own validation
  // hints inline; this state is only for server / network failures
  // surfaced from this parent's checkout call.
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
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

  const dynamicDates = sessions.map(toCourseDate);

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
    setCheckoutError(null);

    const timeoutId = setTimeout(() => setLoadingCheckout(null), 10_000);

    try {
      // Defensive guard: child cards already disable the booking button
      // when no session is selected, so this branch should never fire
      // in normal use. Bail silently rather than surfacing a UI error
      // for an unreachable state.
      if (courseType !== "Onlinekurs" && !sessionId) {
        clearTimeout(timeoutId);
        setLoadingCheckout(null);
        return;
      }

      // Read the GA4 client/session id (if GA loaded via cookie consent) so
      // the conversion fired from the Stripe webhook is credited to this
      // organic-search session. Resolves to empty when GA isn't present.
      const { clientId: gaClientId, sessionId: gaSessionId } = await getGa4Ids();

      const res = await fetch("/api/course-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseKey: template.course_key,
          courseType,
          sessionId: sessionId ?? null,
          gaClientId,
          gaSessionId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        setCheckoutError(data.error || "Fehler beim Starten des Checkouts.");
        clearTimeout(timeoutId);
        setLoadingCheckout(null);
        return;
      }

      redirectTo(data.url);
    } catch {
      setCheckoutError("Unerwarteter Fehler beim Starten des Checkouts.");
      clearTimeout(timeoutId);
      setLoadingCheckout(null);
    }
  };

  const formatPrice = (cents: number | null) => {
    if (cents == null) return "";
    return `EUR ${(cents / 100).toLocaleString("de-DE")}`;
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
     * When true, the standalone Praxiskurs card shows an amber
     * "CME beantragt" pill instead of a numeric CME badge.
     */
    praxisCmePending?: boolean;
    /**
     * When true, the Onlinekurs card shows a "CME beantragt" pill
     * instead of a numeric CME badge. Used when the Praxiskurs is
     * already accredited but the Onlineteil is still in Beantragung
     * (e.g. Grundkurs Botulinum Zahnmedizin).
     */
    onlineCmePending?: boolean;
    /**
     * Accreditation unit label for the CME badges on this course's
     * cards. Defaults to "CME". Zahnmedizin courses are accredited by
     * the Zahnärztekammer with "Fortbildungspunkte", so set
     * `cmeUnit: "Fortbildungspunkte"` there. Applies to the Onlinekurs,
     * Praxiskurs, Kombikurs and Komplettpaket cards alike.
     */
    cmeUnit?: string;
    /**
     * Override for the Onlinekurs CME badge value. Takes precedence
     * over `course_templates.cme_online` from the DB. Used when the
     * Onlinekurs on a landing page corresponds to a different course
     * (e.g. Masterclass Botulinum reuses the Periorale Zone Onlinekurs,
     * which is accredited with 10 CME points).
     */
    cmeOnlineOverride?: string;
    /**
     * Override für den Online- & Praxiskurs (Kombi) CME-Wert. Hat
     * Vorrang vor `course_templates.cme_kombi` aus der DB. Nützlich
     * wenn das Marketing schon mit dem Akkreditierungs-Wert leben
     * soll bevor der DB-Eintrag nachgezogen ist.
     */
    cmeKombiOverride?: string;
    /**
     * Override für den standalone Praxiskurs CME-Wert. Hat Vorrang
     * vor `course_templates.cme_praxis` aus der DB.
     */
    cmePraxisOverride?: string;
    /**
     * When true, the Online- & Praxiskurs (Kombikurs) card shows an
     * amber "CME beantragt" pill instead of a numeric CME badge.
     */
    kombiCmePending?: boolean;
    /**
     * When true, ensures every card's feature list contains an
     * "Ärzt:innen-Community" bullet (added at the end if missing).
     * Useful for courses where access to the community is part of the
     * value prop on every package.
     */
    ensureCommunityFeature?: boolean;
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
    aufbaukurs_botulinum_periorale_zone: {
      // Online-only course, accredited by the LÄK with 10 CME points.
      // Override drives the Onlinekurs CME badge independently of the DB
      // field course_templates.cme_online (same approach as the
      // Masterclass, whose Onlinekurs IS this course).
      cmeOnlineOverride: "10",
    },
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
        { text: "Akkreditiert mit 24 CME-Punkten" },
        { text: "Vollständiger Onlinekurs inkludiert" },
        { text: "6+ Stunden gemeinsames Behandeln" },
        { text: "Üben an echten Proband:innen" },
        { text: "Erfahrene Dozent:innen-Aufsicht" },
        { text: "Max. 5 Teilnehmer:innen" },
        { text: "Ärzt:innen-Community" },
        { text: "EPHIA-Zertifikat nach Abschluss" },
      ],
      // Akkreditierung steht (Marc-Bestätigung 2026-05-31): 11 CME
      // für den Onlineteil, 13 CME für den Praxiskurs, 24 CME für die
      // Kombi-Variante. Overrides nutzen wir damit das Marketing schon
      // anziehen kann, bevor course_templates.cme_* in der DB gepflegt
      // wird; sobald DB-Werte gesetzt sind, ziehen die Overrides
      // gleich (gleicher Wert) und können bei der nächsten Aufräum-
      // Runde entfernt werden.
      cmeOnlineOverride: "11",
      cmePraxisOverride: "13",
      cmeKombiOverride: "24",
    },
    masterclass_botulinum: {
      // Make the equivalence with the Periorale Zone Onlinekurs explicit
      // in the Onlinekurs card description so buyers immediately see
      // they're not paying twice for the same content if they've already
      // taken Periorale Zone.
      onlineDesc: (
        <>
          Inhaltsgleich mit dem{" "}
          <strong className="font-bold">Onlinekurs Botulinum Periorale Zone</strong>.
        </>
      ),
      praxisDesc:
        "Onlinekurs bereits absolviert? Dann buche direkt den Praxiskurs.",
      // Akkreditiert mit insgesamt 22 CME-Punkten durch ZWEI Kammern:
      // Der Onlinekurs IST der Aufbaukurs Periorale Zone Onlinekurs
      // (10 CME, Landesärztekammer Brandenburg), der Praxisteil bringt
      // die restlichen 12 (Landesärztekammer Berlin). Deshalb trägt die
      // Zertifikat-Fußzeile den Plural "Landesärztekammern Berlin und
      // Brandenburg".
      //
      // Praxis (12) und Kombi (22) kommen aus course_templates.cme_praxis
      // / .cme_kombi und brauchen keinen Override. Nur cme_online ist auf
      // der Masterclass-Vorlage NULL, weil der Onlineteil ein eigener
      // Kurs ist, daher der Override auf die 10 der Periorale Zone.
      cmeOnlineOverride: "10",
      // All three packages include access to the Ärzt:innen-Community.
      ensureCommunityFeature: true,
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
      // Der Praxiskurs ist von der Zahnärztekammer mit 9 CME-Punkten
      // zertifiziert; die Zertifizierung des Onlineteils ist beantragt.
      // Onlinekurs => "CME beantragt"; alle Karten, die den Praxisteil
      // enthalten (Kombi + Komplettpaket + Home-Karte), zeigen die
      // zertifizierten 9 CME. Override nutzen wir, weil course_templates
      // .cme_* in der DB (noch) leer ist.
      onlineCmePending: true,
      cmeKombiOverride: "9",
      cmeUnit: "Fortbildungspunkte",
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

        {checkoutError && (
          <div
            role="alert"
            className="mb-8 max-w-2xl mx-auto bg-white text-red-700 rounded-[10px] px-5 py-4 shadow-md flex items-start justify-between gap-4"
          >
            <p className="text-sm md:text-base">{checkoutError}</p>
            <button
              type="button"
              onClick={() => setCheckoutError(null)}
              aria-label="Fehler schließen"
              className="text-red-700 hover:text-red-900 font-bold text-lg leading-none cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {(() => {
          const isPremiumLayout = template.course_key === "grundkurs_botulinum";
          const hasOnline = !!template.price_gross_online_cents;
          const hasPraxis = !!template.price_gross_praxis_cents;
          const hasKombi = !!template.price_gross_kombi_cents;

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

          // Post-processing: swap any "Akkreditiert mit N CME-Punkten"
          // feature for "CME-Punkte beantragt" on cards whose CME is
          // still pending. Driven off the same flags that flip the
          // numeric CME badge to the pending pill, so the card text
          // and the badge always stay in sync.
          const swapPendingCme = (features: { text: string }[]) =>
            features.map((f) =>
              /^Akkreditiert mit \d+ CME[- ]Punkten?$/i.test(f.text)
                ? { text: "CME-Punkte beantragt" }
                : f,
            );
          if (overrides.praxisCmePending) praxisFeatures = swapPendingCme(praxisFeatures);
          if (overrides.kombiCmePending) kombiFeatures = swapPendingCme(kombiFeatures);

          // Optional: ensure every card lists "Ärzt:innen-Community"
          // when the course has explicitly opted into it. Inserts the
          // bullet before "EPHIA-Zertifikat nach Abschluss" so the
          // certificate stays at the end.
          if (overrides.ensureCommunityFeature) {
            const ensureCommunity = (features: { text: string }[]) => {
              if (features.some((f) => f.text === "Ärzt:innen-Community")) return features;
              const certIdx = features.findIndex(
                (f) => f.text === "EPHIA-Zertifikat nach Abschluss",
              );
              const bullet = { text: "Ärzt:innen-Community" };
              if (certIdx === -1) return [...features, bullet];
              return [
                ...features.slice(0, certIdx),
                bullet,
                ...features.slice(certIdx),
              ];
            };
            onlineFeatures = ensureCommunity(onlineFeatures);
            praxisFeatures = ensureCommunity(praxisFeatures);
            kombiFeatures = ensureCommunity(kombiFeatures);
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
                    price={formatPrice(template.price_gross_online_cents)}
                    features={onlineFeatures}
                    bookingType="direct"
                    buttonText="Onlinekurs buchen"
                    onBook={() => handleBooking("Onlinekurs")}
                    isLoading={loadingCheckout === "Onlinekurs-direct"}
                    cmePoints={template.cme_online || undefined}
                    cmePending={overrides.onlineCmePending}
                    titleClassName="text-[1.75rem]"
                  />
                )}

                {hasKombi && (
                  <CourseCard
                    title="Online- & Praxiskurs"
                    description="Lerne die theoretischen Grundlagen online und die Praxis vor Ort an Proband:innen."
                    price={formatPrice(template.price_gross_kombi_cents)}
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
            (!!template.price_gross_premium_cents || isDermalfiller || isLippen || isTherapeutischeIndikationen);
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
                  price={formatPrice(template.price_gross_online_cents)}
                  features={onlineFeatures}
                  bookingType="direct"
                  buttonText="Onlinekurs buchen"
                  onBook={() => handleBooking("Onlinekurs")}
                  isLoading={loadingCheckout === "Onlinekurs-direct"}
                  cmePoints={overrides.hideCme ? undefined : (overrides.cmeOnlineOverride || template.cme_online || undefined)}
                  cmePending={overrides.onlineCmePending}
                  cmeUnit={overrides.cmeUnit}
                />
              )}

              {showPraxis && (
                <CourseCard
                  title="Praxiskurs"
                  description={
                    overrides.praxisDesc ?? (
                      <>
                        Wende Dein <strong className="font-bold">bereits existierendes</strong> theoretisches
                        Wissen in der Praxis an.
                      </>
                    )
                  }
                  price={formatPrice(template.price_gross_praxis_cents)}
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
                  cmePoints={overrides.hideCme ? undefined : (overrides.cmePraxisOverride || template.cme_praxis || undefined)}
                  cmePending={overrides.praxisCmePending}
                  cmeUnit={overrides.cmeUnit}
                />
              )}

              {hasKombi && (
                <CourseCard
                  title="Online- & Praxiskurs"
                  description="Lerne die theoretischen Grundlagen online und die Praxis vor Ort an Proband:innen."
                  price={formatPrice(template.price_gross_kombi_cents)}
                  features={overrides.kombiFeatures || defaultKombi}
                  bookingType="dropdown"
                  dates={dynamicDates}
                  buttonText="Online- & Praxiskurs buchen"
                  additionalInfo="Praxiskurs-Standort: Berlin-Mitte"
                  onBook={(sessionId) => handleBooking("Kombikurs", sessionId)}
                  highlighted={!hasKomplettpaket}
                  isLoading={loadingCheckout?.startsWith("Kombikurs-") || false}
                  selectedDateForLoading={loadingCheckout?.replace("Kombikurs-", "")}
                  cmePoints={overrides.hideCme ? undefined : (overrides.cmeKombiOverride || template.cme_kombi || undefined)}
                  cmePending={overrides.kombiCmePending}
                  cmeUnit={overrides.cmeUnit}
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
                  // CME-Summe für das Lippen-Komplettpaket: Lippen
                  // Kombi (24) + Dermalfiller Online (11) + Hautpflege
                  // (7) + Periorale Zone Online (10) = 52. Lippen ist
                  // seit 2026-05-31 LÄK-akkreditiert und trägt jetzt
                  // mit zum Gesamttotal bei, vorher war es als
                  // pending ausgeschlossen.
                  cmeTotal="52"
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
                  // Praxiskurs ist mit 9 Fortbildungspunkten zertifiziert
                  // (Onlineteil beantragt). Wir zeigen die zertifizierten
                  // 9 Punkte als Headline-Wert auf dem Komplettpaket.
                  cmeTotal="9"
                  cmeUnit={overrides.cmeUnit}
                  includedCourses={ZAHNMEDIZIN_INCLUDED_COURSES}
                />
              )}
            </div>
          );
        })()}

        {/* Curriculum banner. When this course belongs to a curriculum
            (e.g. Botulinum), surface it as a small white-on-blue button
            below the cards that links to the curriculum overview. */}
        {(() => {
          const curriculum = getCurriculumForCourseKey(template.course_key || "");
          if (!curriculum) return null;
          return (
            <div className="mt-12 md:mt-16 max-w-2xl mx-auto">
              <Link
                href={`/kurse/curriculum-${curriculum.slug}`}
                className="block w-full bg-white/10 backdrop-blur-sm rounded-[10px] p-6 text-left hover:bg-white/15 transition-colors group"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="text-white font-bold text-lg">
                    Dieses Kursangebot ist Teil des {curriculum.title}
                  </p>
                  <div className="flex-shrink-0 text-white/80 group-hover:text-white transition-colors">
                    <ArrowRight className="w-6 h-6" aria-hidden="true" />
                  </div>
                </div>
              </Link>
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
