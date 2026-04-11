/**
 * Content schema for the EPHIA home page (kurse.ephia.de shadow site).
 *
 * The home page lives at `src/app/kurse/page.tsx` and is driven by the
 * typed content object in `src/content/kurse/home.ts`. Sections are:
 *   1. Hero
 *   2. Wer wir sind
 *   3. Unsere Kurse (blue course tile grid)
 *   4. Unser Fokus
 *   5. #wearetogether testimonials (reuses CourseTestimonialsContent)
 *   6. Instagram feed (LightWidget)
 */

import type { CourseTestimonialsContent } from "./types";

export interface HomeHeroChecklistItem {
  text: string;
}

export interface HomeHeroContent {
  /** Main H1, may contain line breaks. */
  heading: string;
  /** Short checklist shown below the heading (✓ items). */
  checklist: HomeHeroChecklistItem[];
  ctaLabel: string;
  /** Anchor target or absolute URL */
  ctaHref: string;
  /** Hero image path (relative to /public). Alternative to imageSrc is a video. */
  imagePath: string;
  imageAlt: string;
}

export interface HomeWerWirSindContent {
  heading: string;
  subheading: string;
  videoPath: string;
  videoPoster?: string;
  videoCaptionsPath?: string;
  personName: string;
  personTitle: string;
}

export interface HomeFokusItem {
  /** Lucide icon name */
  icon: string;
  title: string;
  href: string;
  ctaLabel: string;
}

export interface HomeFokusContent {
  heading: string;
  items: HomeFokusItem[];
}

export interface HomeCourseTile {
  /** Small uppercase label above the title, e.g. "GRUNDKURS" */
  kicker: string;
  /** Main title, e.g. "BOTULINUM" */
  title: string;
  /**
   * Runtime-only override: when the page loader resolves a matching
   * `course_templates.title` from the DB via `courseKey`, it populates
   * this field so the component can use the admin-edited title verbatim
   * instead of the hardcoded `kicker + title` merge. NOT written by hand
   * in content files — always populated server-side.
   */
  dbTitle?: string;
  /**
   * Runtime-only override populated from `course_templates.audience`.
   * One of 'humanmediziner' | 'zahnmediziner' | 'alle'. Drives the
   * "Für …:innen" pill on the card. Falls back to courseKey-based
   * detection if unset.
   */
  dbAudience?: string;
  /**
   * Runtime-only override populated from `course_templates.level`.
   * One of 'einsteiger' | 'fortgeschritten'. Drives the level pill
   * on the card. Falls back to kicker-based detection if unset.
   */
  dbLevel?: string;
  /** Second-line subtitle, e.g. "Für Humanmediziner:innen" */
  audience: string;
  /** Longer body text shown inside the card */
  description: string;
  /**
   * Matches `course_templates.course_key`. When set, the tile image +
   * title are resolved server-side from `course_templates.image_url` /
   * `course_templates.title` so marketing stays in sync with whatever
   * Marc edits via the admin.
   */
  courseKey?: string;
  /**
   * Static fallback image path (used if `courseKey` is not set or the
   * DB has no image for it). Omit for the Gruppenbuchungen tile.
   */
  imagePath?: string;
  imageAlt?: string;
  /** CTA button label */
  ctaLabel: string;
  /**
   * Destination. For internal links use a relative path (e.g. "/grundkurs-botulinum").
   * For external LW pages use an absolute URL.
   * If `type === "group-inquiry"`, this is ignored and the button opens the
   * group inquiry dialog instead.
   */
  href?: string;
  /** Special tile type that opens the GroupInquiryDialog on click */
  type?: "group-inquiry";
}

export interface HomeCoursesContent {
  heading: string;
  intro: string;
  tiles: HomeCourseTile[];
}

export interface HomeInstagramContent {
  heading: string;
  subheading?: string;
  /** LightWidget widget ID (the hash in the iframe src URL). */
  widgetId: string;
}

export interface HomeContent {
  meta: {
    title: string;
    description: string;
    ogImage?: string;
  };
  hero: HomeHeroContent;
  werWirSind: HomeWerWirSindContent;
  courses: HomeCoursesContent;
  fokus: HomeFokusContent;
  testimonials: CourseTestimonialsContent;
  instagram: HomeInstagramContent;
}
