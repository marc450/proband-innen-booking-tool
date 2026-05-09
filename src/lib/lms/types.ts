// Domain types for the in-house LMS at study.ephia.de.
//
// Lesson `body` is TipTap ProseMirror JSON. We don't depend on the
// runtime TipTap package on the read side — the renderer in
// renderer.tsx is a tiny pattern-match over the JSON, so the public
// reader has zero editor JS in its bundle.

export type LmsCourse = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_image_url: string | null;
  access_type: "free" | "enrolled";
  is_published: boolean;
  audience_tag: string | null;
  order_index: number;
};

export type LmsChapter = {
  id: string;
  course_id: string;
  slug: string;
  title: string;
  order_index: number;
  is_published: boolean;
};

export type LmsLessonType = "text" | "video";

export type LmsLesson = {
  id: string;
  chapter_id: string;
  slug: string;
  title: string;
  lesson_type: LmsLessonType;
  duration_seconds: number | null;
  body: TipTapDoc;
  cf_stream_video_id: string | null;
  video_thumbnail_url: string | null;
  order_index: number;
  is_published: boolean;
};

// Loaded shape used by the reader: a course with its chapters and
// each chapter's lessons, fully nested. Server queries shape the raw
// rows into this object once and pass it down.
export type LmsCourseTree = LmsCourse & {
  chapters: Array<LmsChapter & { lessons: LmsLesson[] }>;
};

// ── TipTap JSON node types we currently support ───────────────────
// Add a case to the renderer when extending this union.
export type TipTapMark = { type: "bold" | "italic" | "link"; attrs?: Record<string, unknown> };

export type TipTapText = {
  type: "text";
  text: string;
  marks?: TipTapMark[];
};

export type TipTapNode =
  | { type: "doc"; content?: TipTapNode[] }
  | { type: "paragraph"; content?: TipTapNode[] }
  | { type: "heading"; attrs: { level: 1 | 2 | 3 }; content?: TipTapNode[] }
  | { type: "bulletList"; content?: TipTapNode[] }
  | { type: "orderedList"; content?: TipTapNode[] }
  | { type: "listItem"; content?: TipTapNode[] }
  | {
      type: "callout";
      attrs: { variant: "signal" | "rose" | "brown1" };
      content?: TipTapNode[];
    }
  | {
      // Full-bleed signal-blue section. Contents: an optional heading
      // + an optional paragraph as the band's intro, followed by
      // summaryCard children for the bullet items.
      type: "summaryBand";
      attrs: { variant: "signal" };
      content?: TipTapNode[];
    }
  | {
      // White card with a checkmark icon, used inside a summaryBand to
      // present a single takeaway / outcome bullet.
      type: "summaryCard";
      content?: TipTapNode[];
    }
  | {
      type: "video";
      attrs: { cfStreamVideoId: string | null; thumbnailUrl?: string | null };
    }
  | TipTapText;

export type TipTapDoc = Extract<TipTapNode, { type: "doc" }>;
