/**
 * Content schema for EPHIA course landing pages.
 *
 * Each course landing page has a typed content object in `src/content/kurse/<slug>.ts`
 * that drives the dynamic route `/kurse/[slug]`. The widget section pulls its
 * data from Supabase (course_templates + course_sessions); everything else
 * comes from this typed content file.
 */

export interface CourseHeroStat {
  /** Lucide icon name, e.g. "Clock" */
  icon: string;
  /** Small label above the value, e.g. "Dauer" */
  label: string;
  /** Bold value, e.g. "10h + 5h" */
  value: string;
}

export interface CourseHeroContent {
  /** Small tagline / kicker shown above the main heading, e.g. "ANFÄNGER:INNENKURS". Optional. */
  kicker?: string;
  /** Main heading, e.g. "GRUNDKURS BOTULINUM" */
  heading: string;
  /** Benefit-led sub-headline shown directly below the heading, e.g. "Dein sicherer Einstieg..." */
  subheadline?: string;
  /** Structured fact row shown below the sub-headline */
  stats?: CourseHeroStat[];
  /** Long description paragraph(s) */
  description: string;
  /** Path (relative to /public) to the hero video */
  videoPath: string;
  /** Path (relative to /public) to the hero video poster image (shown before play) */
  videoPoster: string;
}

export interface CourseLernziel {
  /** Short label, e.g. "Anatomie" */
  label: string;
  /** One-sentence description */
  description: string;
  /** Lucide icon name (optional) */
  icon?: string;
}

export interface CourseLernzieleContent {
  heading: string;
  intro?: string;
  items: CourseLernziel[];
}

export interface CourseGruppenbuchungenContent {
  heading: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
}

export interface CourseChapterSub {
  title: string;
  description: string;
}

export interface CourseChapter {
  number: number;
  title: string;
  /** Optional short summary shown when collapsed */
  summary?: string;
  /** Sub-sections shown when expanded */
  subsections?: CourseChapterSub[];
}

export interface CourseInhaltContent {
  heading: string;
  intro?: string;
  chapters: CourseChapter[];
}

export interface CourseLernplattformFeature {
  title: string;
  description: string;
  bullets?: string[];
  /** Path (relative to /public). If it ends with .mp4/.webm, rendered as autoplay muted loop video. */
  mediaPath: string;
  /** Optional poster for video media */
  mediaPoster?: string;
}

export interface CourseLernplattformContent {
  heading: string;
  features: CourseLernplattformFeature[];
}

export interface CourseCtaBannerContent {
  heading: string;
  ctaLabel: string;
  /** Anchor ID to scroll to, e.g. "kursangebote" */
  ctaHref: string;
}

export interface CourseTestimonial {
  quote: string;
  name: string;
  title: string;
  location?: string;
  photoPath?: string;
}

export interface CourseTestimonialsContent {
  heading: string;
  items: CourseTestimonial[];
}

export interface CourseFaqItem {
  question: string;
  answer: string;
}

export interface CourseFaqContent {
  heading: string;
  items: CourseFaqItem[];
}

export interface CourseMeta {
  /** HTML <title> */
  title: string;
  /** <meta name="description"> */
  description: string;
  /** Open Graph image path (relative to /public) */
  ogImage?: string;
}

/**
 * Complete typed content for one course landing page.
 * The `courseKey` MUST match a row in `course_templates.course_key`
 * so the booking widget can fetch the right sessions.
 */
export interface CourseLandingContent {
  /** URL slug, e.g. "grundkurs-botulinum" (this is what /kurse/[slug] matches) */
  slug: string;
  /** Supabase course_templates.course_key, e.g. "grundkurs_botulinum" */
  courseKey: string;
  meta: CourseMeta;
  hero: CourseHeroContent;
  lernziele: CourseLernzieleContent;
  /** Heading shown above the booking widget, e.g. "UNSERE KURSANGEBOTE" */
  kursangeboteHeading: string;
  gruppenbuchungen: CourseGruppenbuchungenContent;
  inhalt: CourseInhaltContent;
  lernplattform: CourseLernplattformContent;
  ctaBanner: CourseCtaBannerContent;
  testimonials: CourseTestimonialsContent;
  faq: CourseFaqContent;
}
