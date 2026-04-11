/**
 * Content schema for the combined `/kurse/team` page (Team + Dozent:innen).
 *
 * The page lives at `src/app/kurse/team/page.tsx` and is driven by the
 * typed content object in `src/content/kurse/team.ts`.
 *
 * Sections:
 *   1. Hero / intro
 *   2. Unsere Dozent:innen (cards with curriculum modal)
 *   3. Unser Team (operations / brand / founders)
 *   4. Unser Review-Board (scientific board)
 *   5. Initiativbewerbung CTA
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

export interface Dozent {
  id: string;
  name: string;
  /** Role label shown under the name, e.g. "Mitgründerin & Dozentin". */
  role: string;
  /** Optional path to a portrait photo (relative to /public). */
  imagePath?: string;
  imageAlt?: string;
  /** Short bio shown on the card (2-4 sentences). */
  shortBio: string;
  /** Detailed curriculum shown in the modal. Optional. */
  curriculum?: Curriculum;
}

export interface TeamMember {
  name: string;
  role: string;
  imagePath?: string;
  imageAlt?: string;
  shortBio?: string;
}

export interface TeamSectionContent {
  eyebrow?: string;
  heading: string;
  intro?: string;
  items: TeamMember[];
}

export interface TeamPageContent {
  meta: {
    title: string;
    description: string;
  };
  hero: {
    eyebrow?: string;
    heading: string;
    intro: string;
  };
  dozenten: {
    eyebrow?: string;
    heading: string;
    intro?: string;
    items: Dozent[];
    /** Label for the modal trigger button on each card. */
    ctaLabel: string;
  };
  team: TeamSectionContent;
  reviewBoard: TeamSectionContent;
  cta: {
    heading: string;
    body: string;
    email: string;
    bullets: string[];
  };
}
