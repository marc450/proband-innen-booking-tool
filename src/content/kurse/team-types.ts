/**
 * Content schema for the `/kurse/team` page.
 *
 * The page lives at `src/app/kurse/team/page.tsx` and is driven by the
 * typed content object in `src/content/kurse/team.ts`.
 *
 * Sections:
 *   1. Hero / intro
 *   2. Unser Team — one combined grid with Dozent:innen and
 *      operations / founders / brand all mixed together. Cards for
 *      people who have a curriculum show a subtle "Vita ansehen →"
 *      link that opens a modal.
 *   3. Unser Review-Board (scientific board, separate section)
 *   4. Initiativbewerbung CTA
 */

/** A single curriculum line. Either a plain bullet or a labelled sub-list. */
export type CurriculumItem =
  | string
  | {
      /** Bold label, e.g. "Ausbildung unter anderem bei:" or "Rotationen:" */
      label: string;
      items: string[];
    };

export interface CurriculumSection {
  /** Section title, e.g. "Klinische Medizin". */
  heading: string;
  /** Optional intro paragraph above the bullet list. */
  intro?: string;
  /** Mixed bullets (plain strings or labelled sub-lists). */
  items?: CurriculumItem[];
}

export interface Curriculum {
  /** Optional one-liner shown right under the name in the modal. */
  tagline?: string;
  sections: CurriculumSection[];
}

/**
 * A media appearance: a podcast episode, radio/TV interview, or press
 * feature. Rendered in a dedicated "Podcasts & Interviews" section on the
 * profile page (separate from the social/professional `sameAs` links),
 * and additionally merged into the Person JSON-LD `sameAs` array so the
 * URLs still count as EEAT trust signals.
 */
export interface MediaAppearance {
  /** Canonical URL of the episode / interview / article. */
  url: string;
  /** Title shown as the link text, e.g. the episode title. */
  title: string;
  /** Outlet / show, e.g. "radioeins, Die schöne Woche" or "WDR 2, Jörg Thadeusz". */
  outlet: string;
  /** Short format tag shown as a pill, e.g. "Podcast" or "Radio-Interview". */
  format?: string;
}

/**
 * A single person on the team page. Covers both Dozent:innen
 * (optional `curriculum`) and operations / founders / brand.
 */
export interface Person {
  id: string;
  name: string;
  /** Role label shown under the name, e.g. "Mitgründerin & Dozentin". */
  role: string;
  /** Optional path to a portrait photo (absolute URL or /public path). */
  imagePath?: string;
  imageAlt?: string;
  /** Short bio shown on the card and used as the meta description.
   *  Keep it concise (one or two sentences). */
  shortBio?: string;
  /** Longer, multi-paragraph bio shown on the dedicated profile page
   *  hero. Each string is one paragraph. When present it replaces the
   *  shortBio on the profile page (the card and meta still use shortBio).
   *  Use this to convey the person's full depth without bloating the
   *  team-grid card. */
  bio?: string[];
  /** Detailed curriculum shown in the modal. Only Dozent:innen have this. */
  curriculum?: Curriculum;
  /**
   * External profile URLs (LinkedIn, eigene Praxis-Website, Jameda /
   * Doctolib, professionelles Instagram, ResearchGate / ORCID, …).
   * Emitted as the Person JSON-LD `sameAs` array on the profile page,
   * the single strongest EEAT trust-transfer signal. Fill in over time;
   * an empty array simply omits `sameAs` from the schema.
   */
  sameAs?: string[];
  /**
   * Podcast episodes, radio/TV interviews and press features. Rendered as
   * a dedicated "Podcasts & Interviews" section on the profile page and
   * merged into the JSON-LD `sameAs` for EEAT. Keep social/professional
   * profiles in `sameAs`; put media coverage here.
   */
  media?: MediaAppearance[];
  /**
   * Optional override for the schema `knowsAbout` topics. Defaults to a
   * sensible aesthetic-medicine set for Dozent:innen.
   */
  knowsAbout?: string[];
  /** Optional medical specialty for schema `medicalSpecialty`, e.g. "Anästhesiologie". */
  medicalSpecialty?: string;
}

export interface PeopleSectionContent {
  /** Optional section heading. Omit to render the grid without a header block
   *  (e.g. the main combined team section, where the page hero already says
   *  "Unser Team"). */
  heading?: string;
  intro?: string;
  items: Person[];
}

export interface TeamPageContent {
  meta: {
    title: string;
    description: string;
  };
  hero: {
    heading: string;
    intro: string;
  };
  /** Combined Dozent:innen + operations team (one big grid). */
  team: PeopleSectionContent & {
    /** Label for the subtle vita link shown on Dozent:innen cards. */
    vitaLinkLabel: string;
  };
  /** Scientific review board — always rendered as its own section. */
  reviewBoard: PeopleSectionContent;
  cta: {
    heading: string;
    body: string;
    email: string;
    bullets: string[];
  };
}
