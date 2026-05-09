// study.ephia.de/{courseSlug}/{chapterSlug}/{lessonSlug}  → lesson reader.
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCourseTreeBySlug, flattenLessons } from "@/lib/lms/queries";
import { ReaderFrame } from "@/components/lms/reader-frame";
import { LessonBody } from "@/lib/lms/renderer";
import { CfStreamPlayer } from "@/components/lms/cf-stream-player";
import type { TipTapDoc } from "@/lib/lms/types";

// Pull the Cloudflare Stream UID out of a video-lesson body. The seed
// migration encodes it at content[0].attrs.cfStreamVideoId; the
// dedicated video lesson page reads from there. Returns null if the
// body doesn't have a video node (or if it's still unset).
function extractVideoId(doc: TipTapDoc): string | null {
  const first = doc.content?.[0];
  if (first?.type === "video") return first.attrs.cfStreamVideoId ?? null;
  return null;
}

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

  // Video lessons keep the rose title strip and let the player
  // stretch edge-to-edge below it (no max-width constraint).
  if (lesson.lesson_type === "video") {
    const videoId = extractVideoId(lesson.body) ?? lesson.cf_stream_video_id;
    return (
      <ReaderFrame
        tree={tree}
        currentLessonHref={currentHref}
        prevHref={prevHref}
        nextHref={nextHref}
      >
        <header className="bg-[#FAEBE1] md:flex-shrink-0">
          <div className="max-w-3xl mx-auto px-6 py-12">
            <h1 className="text-4xl font-bold leading-tight uppercase tracking-tight">
              {lesson.title}
            </h1>
          </div>
        </header>
        {/* Player fills remaining vertical space on desktop so the
            page never scrolls. On mobile the player keeps its 16:9
            aspect ratio and the page scrolls naturally. */}
        <div className="md:flex-1 md:min-h-0 md:overflow-hidden bg-black">
          <CfStreamPlayer videoId={videoId} fillHeight />
        </div>
      </ReaderFrame>
    );
  }

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
      {/* White body. The renderer wraps each top-level block in its
          own max-w-3xl container, so full-bleed nodes (summaryBand)
          can break out of the column. */}
      <div className="py-10">
        <LessonBody doc={lesson.body} />
      </div>
    </ReaderFrame>
  );
}
