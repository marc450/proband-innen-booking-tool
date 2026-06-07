// Admin-side LMS loaders. Unlike queries.ts (which runs under RLS and
// only sees published rows), these use the service-role client so the
// editor can list and edit DRAFT (is_published = false) content too.
// Server-only — never import into a client component.
import { createAdminClient } from "@/lib/supabase/admin";
import type { LmsCourse, LmsChapter, LmsLesson, LmsCourseTree } from "./types";

// Full catalog: every course with its chapters and lessons, published
// or not, in display order. Used by the outline manager.
export async function getAdminCourseCatalog(): Promise<LmsCourseTree[]> {
  const admin = createAdminClient();

  const [coursesRes, chaptersRes, lessonsRes] = await Promise.all([
    admin.from("lms_courses").select("*").order("order_index", { ascending: true }),
    admin.from("lms_chapters").select("*").order("order_index", { ascending: true }),
    // Lesson bodies can be large; the outline only needs metadata.
    admin
      .from("lms_lessons")
      .select(
        "id, chapter_id, slug, title, lesson_type, duration_seconds, cf_stream_video_id, video_thumbnail_url, order_index, is_published",
      )
      .order("order_index", { ascending: true }),
  ]);

  if (coursesRes.error) throw coursesRes.error;
  if (chaptersRes.error) throw chaptersRes.error;
  if (lessonsRes.error) throw lessonsRes.error;

  const courses = (coursesRes.data ?? []) as LmsCourse[];
  const chapters = (chaptersRes.data ?? []) as LmsChapter[];
  const lessons = (lessonsRes.data ?? []) as Array<Omit<LmsLesson, "body">>;

  return courses.map((course) => ({
    ...course,
    chapters: chapters
      .filter((ch) => ch.course_id === course.id)
      .map((ch) => ({
        ...ch,
        lessons: lessons.filter((l) => l.chapter_id === ch.id) as LmsLesson[],
      })),
  }));
}

// Single lesson with its full body, regardless of publish state. Used by
// the lesson editor and the admin preview route.
export async function getAdminLesson(id: string): Promise<LmsLesson | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("lms_lessons")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as LmsLesson) ?? null;
}

// Resolve a lesson's chapter + course (for breadcrumbs / preview context).
export async function getAdminLessonContext(lesson: LmsLesson): Promise<{
  chapter: LmsChapter | null;
  course: LmsCourse | null;
}> {
  const admin = createAdminClient();
  const { data: chapter } = await admin
    .from("lms_chapters")
    .select("*")
    .eq("id", lesson.chapter_id)
    .maybeSingle();
  let course: LmsCourse | null = null;
  if (chapter) {
    const { data } = await admin
      .from("lms_courses")
      .select("*")
      .eq("id", chapter.course_id)
      .maybeSingle();
    course = (data as LmsCourse) ?? null;
  }
  return { chapter: (chapter as LmsChapter) ?? null, course };
}
