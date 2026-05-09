-- 075_lms_initial.sql
-- Initial LMS tables for the in-house course player that replaces
-- LearnWorlds. Three tables:
--   * lms_courses    — top-level course (one per slug, e.g. the free
--                       Botox tutorial)
--   * lms_chapters   — sections inside a course (the TOC groups in the
--                       LW player)
--   * lms_lessons    — individual pages, either a TipTap rich-text body
--                       or a single Cloudflare Stream video node
--
-- Lesson body is always TipTap ProseMirror JSON. Video lessons store a
-- doc with one `video` node; text lessons store the full rich-text doc.
-- `lesson_type` is a denormalised hint so the TOC can pick the right
-- icon (book vs play) without parsing JSON. The editor keeps the two
-- in sync.
--
-- No progress / enrollment tables yet — first courses are open and
-- short, and we do not need per-user state. Add when paid courses come.

BEGIN;

-- ── Courses ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lms_courses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,
  title           text NOT NULL,
  subtitle        text,
  description     text,
  cover_image_url text,
  -- Future-proofing for paid courses. Free tutorial uses 'free'.
  access_type     text NOT NULL DEFAULT 'free'
                    CHECK (access_type IN ('free', 'enrolled')),
  is_published    boolean NOT NULL DEFAULT false,
  -- For analytics / segmenting on the course hub page.
  audience_tag    text,
  order_index     integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lms_courses_published_idx
  ON public.lms_courses (is_published, order_index)
  WHERE is_published = true;

-- ── Chapters ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lms_chapters (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id    uuid NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  slug         text NOT NULL,
  title        text NOT NULL,
  order_index  integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, slug)
);

CREATE INDEX IF NOT EXISTS lms_chapters_course_order_idx
  ON public.lms_chapters (course_id, order_index);

-- ── Lessons ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lms_lessons (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id             uuid NOT NULL REFERENCES public.lms_chapters(id) ON DELETE CASCADE,
  slug                   text NOT NULL,
  title                  text NOT NULL,
  -- Denormalised hint for the TOC icon. Editor maintains it.
  lesson_type            text NOT NULL DEFAULT 'text'
                           CHECK (lesson_type IN ('text', 'video')),
  duration_seconds       integer,
  -- TipTap ProseMirror doc. Empty doc by default so the reader never
  -- has to handle NULL.
  body                   jsonb NOT NULL DEFAULT '{"type":"doc","content":[]}'::jsonb,
  -- Cloudflare Stream UID for video lessons. Null for text lessons.
  cf_stream_video_id     text,
  video_thumbnail_url    text,
  order_index            integer NOT NULL DEFAULT 0,
  is_published           boolean NOT NULL DEFAULT false,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chapter_id, slug)
);

CREATE INDEX IF NOT EXISTS lms_lessons_chapter_order_idx
  ON public.lms_lessons (chapter_id, order_index);

-- ── updated_at triggers ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.lms_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lms_courses_updated_at  ON public.lms_courses;
DROP TRIGGER IF EXISTS trg_lms_chapters_updated_at ON public.lms_chapters;
DROP TRIGGER IF EXISTS trg_lms_lessons_updated_at  ON public.lms_lessons;

CREATE TRIGGER trg_lms_courses_updated_at
  BEFORE UPDATE ON public.lms_courses
  FOR EACH ROW EXECUTE FUNCTION public.lms_set_updated_at();

CREATE TRIGGER trg_lms_chapters_updated_at
  BEFORE UPDATE ON public.lms_chapters
  FOR EACH ROW EXECUTE FUNCTION public.lms_set_updated_at();

CREATE TRIGGER trg_lms_lessons_updated_at
  BEFORE UPDATE ON public.lms_lessons
  FOR EACH ROW EXECUTE FUNCTION public.lms_set_updated_at();

-- ── RLS ────────────────────────────────────────────────────────────
-- Public (anon + authenticated) can read published rows. All writes
-- happen via the service-role admin client from the staff editor API
-- routes, which bypasses RLS entirely.
ALTER TABLE public.lms_courses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_lessons  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lms_courses public read published"  ON public.lms_courses;
DROP POLICY IF EXISTS "lms_chapters public read published" ON public.lms_chapters;
DROP POLICY IF EXISTS "lms_lessons public read published"  ON public.lms_lessons;

CREATE POLICY "lms_courses public read published"
  ON public.lms_courses
  FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

-- A chapter is publicly readable iff it's published AND its parent
-- course is published. Same shape for lessons. This keeps "draft"
-- chapters/lessons invisible even if their slug is guessed.
CREATE POLICY "lms_chapters public read published"
  ON public.lms_chapters
  FOR SELECT
  TO anon, authenticated
  USING (
    is_published = true
    AND EXISTS (
      SELECT 1 FROM public.lms_courses c
      WHERE c.id = course_id AND c.is_published = true
    )
  );

CREATE POLICY "lms_lessons public read published"
  ON public.lms_lessons
  FOR SELECT
  TO anon, authenticated
  USING (
    is_published = true
    AND EXISTS (
      SELECT 1 FROM public.lms_chapters ch
      JOIN public.lms_courses c ON c.id = ch.course_id
      WHERE ch.id = chapter_id
        AND ch.is_published = true
        AND c.is_published = true
    )
  );

COMMIT;
