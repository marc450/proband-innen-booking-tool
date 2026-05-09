// Server-side data loaders for the LMS reader. RLS keeps the queries
// honest (only `is_published = true` rows reach us). Each loader runs
// once per request so the lesson page can pull the whole tree in one
// round trip.
import { createClient } from "@/lib/supabase/server";
import type {
  LmsCourse,
  LmsCourseTree,
  LmsChapter,
  LmsLesson,
} from "./types";

export async function listPublishedCourses(): Promise<LmsCourse[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lms_courses")
    .select("*")
    .order("order_index", { ascending: true });
  if (error) throw error;
  return (data ?? []) as LmsCourse[];
}

export async function getCourseTreeBySlug(
  courseSlug: string,
): Promise<LmsCourseTree | null> {
  const supabase = await createClient();

  const { data: course, error: courseErr } = await supabase
    .from("lms_courses")
    .select("*")
    .eq("slug", courseSlug)
    .maybeSingle();
  if (courseErr) throw courseErr;
  if (!course) return null;

  const { data: chapters, error: chErr } = await supabase
    .from("lms_chapters")
    .select("*")
    .eq("course_id", course.id)
    .order("order_index", { ascending: true });
  if (chErr) throw chErr;

  const chapterIds = (chapters ?? []).map((c) => c.id);
  let lessons: LmsLesson[] = [];
  if (chapterIds.length > 0) {
    const { data: lessonRows, error: lsErr } = await supabase
      .from("lms_lessons")
      .select("*")
      .in("chapter_id", chapterIds)
      .order("order_index", { ascending: true });
    if (lsErr) throw lsErr;
    lessons = (lessonRows ?? []) as LmsLesson[];
  }

  const tree: LmsCourseTree = {
    ...(course as LmsCourse),
    chapters: (chapters ?? []).map((ch) => ({
      ...(ch as LmsChapter),
      lessons: lessons.filter((l) => l.chapter_id === ch.id),
    })),
  };
  return tree;
}

// Flat list of (chapter, lesson) pairs in display order. Used to
// compute the "Zurück / Weiter" pointers on the reader.
export function flattenLessons(tree: LmsCourseTree) {
  const out: Array<{
    chapter: LmsChapter;
    lesson: LmsLesson;
  }> = [];
  for (const ch of tree.chapters) {
    for (const l of ch.lessons) out.push({ chapter: ch, lesson: l });
  }
  return out;
}
