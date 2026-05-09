// study.ephia.de/{courseSlug}/{chapterSlug}/{lessonSlug}  → lesson reader.
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCourseTreeBySlug, flattenLessons } from "@/lib/lms/queries";
import { ReaderFrame } from "@/components/lms/reader-frame";
import { LessonBody } from "@/lib/lms/renderer";

type Params = {
  courseSlug: string;
  chapterSlug: string;
  lessonSlug: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { courseSlug, chapterSlug, lessonSlug } = await params;
  const tree = await getCourseTreeBySlug(courseSlug);
  const ch = tree?.chapters.find((c) => c.slug === chapterSlug);
  const ls = ch?.lessons.find((l) => l.slug === lessonSlug);
  if (!tree || !ch || !ls) return { title: "EPHIA Lernzentrum" };
  return {
    title: `${ls.title} | ${tree.title}`,
  };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { courseSlug, chapterSlug, lessonSlug } = await params;
  const tree = await getCourseTreeBySlug(courseSlug);
  if (!tree) notFound();

  const chapter = tree.chapters.find((c) => c.slug === chapterSlug);
  if (!chapter) notFound();
  const lesson = chapter.lessons.find((l) => l.slug === lessonSlug);
  if (!lesson) notFound();

  const flat = flattenLessons(tree);
  const idx = flat.findIndex((p) => p.lesson.id === lesson.id);
  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null;

  const currentHref = `/${tree.slug}/${chapter.slug}/${lesson.slug}`;
  const prevHref = prev
    ? `/${tree.slug}/${prev.chapter.slug}/${prev.lesson.slug}`
    : null;
  const nextHref = next
    ? `/${tree.slug}/${next.chapter.slug}/${next.lesson.slug}`
    : null;

  return (
    <ReaderFrame
      tree={tree}
      currentLessonHref={currentHref}
      prevHref={prevHref}
      nextHref={nextHref}
    >
      {/* Rose accent strip behind the lesson title only. */}
      <header className="bg-[#FAEBE1]">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <h1 className="text-4xl font-bold leading-tight uppercase tracking-tight">
            {lesson.title}
          </h1>
        </div>
      </header>
      {/* White body. */}
      <div className="max-w-3xl mx-auto px-6 py-10">
        <LessonBody doc={lesson.body} />
      </div>
    </ReaderFrame>
  );
}
