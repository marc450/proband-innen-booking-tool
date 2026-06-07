// CME-Fallbeispiele content registry.
//
// Each entry is one peer-reviewed, CME-oriented clinical case study,
// rendered by src/app/kurse/cme-fallbeispiele/[caseSlug]/page.tsx and
// listed on the hub at src/app/kurse/cme-fallbeispiele/page.tsx.
//
// PUBLISHING RULE: a case study only goes live (listed on the hub +
// indexable + JSON-LD emitted) when `published: true`. Until then the
// spoke renders for local review but is noindex and unlinked. NEVER set
// published: true while the body is still placeholder text or while the
// author is not a real, credentialed Dozent:in — this is public YMYL
// medical content.

export interface CaseStudySection {
  heading: string;
  /** Body paragraphs for this section. */
  paragraphs?: string[];
  /** Optional bullet list rendered under the paragraphs. */
  bullets?: string[];
}

export interface CaseStudyFaq {
  question: string;
  answer: string;
}

export interface CaseStudyAuthor {
  /** Full name incl. academic title, e.g. "Dr. med. Sophia Wilk-Vollmann". */
  name: string;
  /** Role/credential line for the E-E-A-T author box. */
  role: string;
}

export type CaseStudyType = "Komplikation" | "Behandlung" | "Indikation";

export interface CaseStudy {
  slug: string;
  /** Gate for going live. See PUBLISHING RULE above. */
  published: boolean;
  type: CaseStudyType;
  /** H1 + hub card title. */
  title: string;
  /** <title> tag content; the " | EPHIA" suffix is appended centrally. */
  metaTitle: string;
  metaDescription: string;
  /** One-line teaser for the hub card. */
  teaser: string;
  /** Lead paragraph(s) under the H1. */
  lead: string[];
  /** ISO dates for schema datePublished / dateModified. */
  publishedIso: string;
  updatedIso: string;
  author: CaseStudyAuthor;
  /** CME learning objective, shown in a callout near the top. */
  cmeObjective: string;
  /** Internal link down to the matching course landing page. Use the
   *  internal /kurse/<slug> href (the middleware serves the clean URL). */
  course: { label: string; href: string };
  /** Clinical body following the CME case-study template. */
  sections: CaseStudySection[];
  faq: CaseStudyFaq[];
  /** Reference list (Leitlinien, Studien). Shown verbatim. */
  sources: string[];
  /** slugs of related case studies for cross-linking. */
  relatedSlugs?: string[];
}

// ─────────────────────────────────────────────────────────────────────
// Tier 1 spoke. Reclaims the (now 301'd) /blog/erysipel-nach-skinbooster
// ranking. Body is PLACEHOLDER until Marc supplies the LearnWorlds text.
// ─────────────────────────────────────────────────────────────────────
const erysipelNachSkinbooster: CaseStudy = {
  slug: "erysipel-nach-skinbooster",
  published: false, // ← flip to true only with real body + real author
  type: "Komplikation",
  title: "Erysipel nach Skinbooster: Erkennen, abgrenzen, behandeln",
  metaTitle: "Erysipel nach Skinbooster: Diagnose und Therapie",
  metaDescription:
    "CME-Fallbeispiel: Wie Du ein Erysipel im Gesicht nach Skinbooster oder Filler erkennst, von einer banalen Rötung abgrenzt und leitliniengerecht behandelst, auch bei Penicillinallergie.",
  teaser:
    "Wie Du eine infektiöse Komplikation nach Injektion sicher von einer banalen Reaktion abgrenzt und leitliniengerecht behandelst.",
  lead: [
    "[PLATZHALTER-LEAD. Hier den Einstieg aus dem LearnWorlds-Original einsetzen: kurze klinische Einordnung, warum das Erysipel nach Injektionsbehandlungen relevant ist und worum es im Fall geht.]",
  ],
  publishedIso: "2026-06-07",
  updatedIso: "2026-06-07",
  author: {
    name: "Dr. med. [Autor:in eintragen]",
    role: "Ärztliche Leitung, EPHIA",
  },
  cmeObjective:
    "Nach diesem Fallbeispiel kannst Du ein Erysipel im Gesicht nach Injektionsbehandlung klinisch erkennen, von Differenzialdiagnosen abgrenzen und eine leitliniengerechte Therapie einleiten, inklusive Vorgehen bei Penicillinallergie.",
  course: {
    label: "Aufbaukurs Biostimulation & Skinbooster",
    href: "/kurse/aufbaukurs-biostimulation-skinbooster",
  },
  sections: [
    {
      heading: "Falldarstellung",
      paragraphs: [
        "[PLATZHALTER. Anonymisierte Falldarstellung aus dem LearnWorlds-Original einsetzen: Patient:in, zeitlicher Verlauf nach der Behandlung, Beschwerden, Befund.]",
      ],
    },
    {
      heading: "Klinik und Differenzialdiagnose",
      paragraphs: [
        "[PLATZHALTER. Leitsymptome des Erysipels und die wichtigsten Differenzialdiagnosen abgrenzen.]",
      ],
      bullets: [
        "Erysipel: scharf begrenzte, überwärmte Rötung, Fieber, rasche Ausbreitung",
        "Banale postprozedurale Reaktion: begrenzt, rückläufig, kein Fieber",
        "Allergische bzw. entzündliche Reaktion auf das Produkt",
        "[Weitere Differenzialdiagnosen aus dem Original ergänzen]",
      ],
    },
    {
      heading: "Risikofaktoren und Pathophysiologie",
      paragraphs: [
        "[PLATZHALTER. Eintrittspforten, Hygiene, Wirtsfaktoren und der Bezug zur Injektionsbehandlung.]",
      ],
    },
    {
      heading: "Akutmanagement und antibiotische Therapie",
      paragraphs: [
        "[PLATZHALTER. Therapieschema inklusive Vorgehen bei Penicillinallergie und Kriterien für eine stationäre Einweisung.]",
      ],
    },
    {
      heading: "Nachsorge, Verlaufskontrolle und Aufklärung",
      paragraphs: [
        "[PLATZHALTER. Verlaufskontrolle, Red Flags für die Patient:in, Dokumentation und Aufklärung.]",
      ],
    },
    {
      heading: "Take-home",
      paragraphs: [
        "[PLATZHALTER. Drei bis vier Kernaussagen für die Praxis.]",
      ],
    },
  ],
  faq: [
    {
      question:
        "Wie unterscheide ich ein Erysipel von einer banalen Rötung nach Skinbooster?",
      answer:
        "[PLATZHALTER-ANTWORT. Kurze, klare Abgrenzung einsetzen.]",
    },
    {
      question:
        "Welche Antibiotika kommen beim Erysipel im Gesicht infrage, auch bei Penicillinallergie?",
      answer: "[PLATZHALTER-ANTWORT.]",
    },
    {
      question: "Ab wann ist eine stationäre Einweisung nötig?",
      answer: "[PLATZHALTER-ANTWORT.]",
    },
  ],
  sources: [
    "[Quellen prüfen und einsetzen, z. B. AWMF-Leitlinie zu Haut- und Weichgewebeinfektionen.]",
  ],
};

const CASE_STUDIES: CaseStudy[] = [erysipelNachSkinbooster];

export function getAllCaseStudies(): CaseStudy[] {
  return CASE_STUDIES;
}

export function getPublishedCaseStudies(): CaseStudy[] {
  return CASE_STUDIES.filter((c) => c.published);
}

export function getCaseStudy(slug: string): CaseStudy | undefined {
  return CASE_STUDIES.find((c) => c.slug === slug);
}

export function getAllCaseSlugs(): string[] {
  return CASE_STUDIES.map((c) => c.slug);
}

// Roadmap shown on the hub as "In Vorbereitung". Titles only (no medical
// claims), so it's safe to display before the spokes exist. Move an entry
// into CASE_STUDIES (published) as each one is written.
export const UPCOMING_CASE_STUDIES: { title: string; type: CaseStudyType }[] = [
  { title: "Botulinumtoxin bei Bruxismus und Masseterhypertrophie", type: "Indikation" },
  { title: "Glabella: Anatomie, Ptosis-Risiko und sichere Technik", type: "Behandlung" },
  { title: "Gefäßverschluss nach Filler und Hyaluronidase-Notfallmanagement", type: "Komplikation" },
  { title: "Visusverlust-Risiko bei Gesichtsinjektionen", type: "Komplikation" },
];
