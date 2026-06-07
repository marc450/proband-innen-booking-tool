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

export type QuizQuestion = {
  question: string;
  options: { text: string; correct: boolean }[];
};

export type TipTapText = {
  type: "text";
  text: string;
  marks?: TipTapMark[];
};

export type TipTapNode =
  | { type: "doc"; content?: TipTapNode[] }
  | {
      type: "paragraph";
      // Optional weight override. Default inherits from the parent
      // (e.g. callouts have font-bold; setting weight: "normal" on a
      // paragraph inside a callout opts that paragraph out of bold).
      attrs?: { weight?: "normal" | "bold" };
      content?: TipTapNode[];
    }
  | {
      type: "heading";
      attrs: { level: 1 | 2 | 3; variant?: "default" | "brown1" };
      content?: TipTapNode[];
    }
  | {
      type: "bulletList";
      // check: black checkmark circle icon, single-line bold items.
      //        Lernziele-style outcome lists.
      // book:  small book icon, supports multi-paragraph items.
      //        Journal Club-style paper-summary lists.
      attrs?: { variant?: "default" | "check" | "book" };
      content?: TipTapNode[];
    }
  | {
      type: "orderedList";
      attrs?: { variant?: "default" | "citations" };
      content?: TipTapNode[];
    }
  | { type: "listItem"; content?: TipTapNode[] }
  | {
      // signal: solid signal-blue with white text.
      // rose:   warm rose tint with brown1 text, used for reflection
      //         prompts ("Frage Dich selbst").
      // brown1: dark brown with rose text.
      // think:  signal-blue with a lightbulb icon prefix, used for
      //         key insights / takeaways embedded in the prose.
      type: "callout";
      attrs: { variant: "signal" | "rose" | "brown1" | "think" };
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
  | {
      // Captioned image (Abb. N + description). `label` renders bold
      // before the caption; both are optional. `src` is a full URL
      // (Supabase Storage on the lms-images bucket in our case).
      type: "figure";
      attrs: {
        src: string;
        alt: string;
        label?: string;
        caption?: string;
      };
    }
  | {
      // A row of figures rendered side by side (responsive: stacks on
      // mobile). Children must be `figure` nodes. Used e.g. for two QR
      // code cards next to each other.
      type: "figureRow";
      content?: TipTapNode[];
    }
  | {
      // Big signal-blue call-to-action button, centered. External
      // links open in a new tab.
      type: "ctaButton";
      attrs: {
        label: string;
        href: string;
      };
    }
  | {
      // Interactive multi-question quiz. The reader is a client
      // component (QuizBlock) that handles state, timer and the
      // coupon reveal. Each option carries its own `correct` flag.
      type: "quiz";
      attrs: {
        questions: QuizQuestion[];
        passCouponCode?: string;
        // Human-readable label for the reward (e.g. "50 € Gutschein"
        // or "5% Gutschein"). Used in intro + result copy.
        voucherLabel?: string;
        grundkursUrl?: string;
        timePerQuestionSeconds?: number;
      };
    }
  | {
      // Lightweight celebration block: bouncing smiley + pulsing
      // sparkles + a one-line motivational message. Intended as a
      // chapter outro / "And don't forget" replacement.
      type: "motivationBlock";
      attrs: { message: string };
    }
  | TipTapText;

export type TipTapDoc = Extract<TipTapNode, { type: "doc" }>;
