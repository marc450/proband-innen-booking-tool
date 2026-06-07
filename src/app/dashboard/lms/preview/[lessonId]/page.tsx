// Admin preview: renders a lesson through the REAL reader renderer
// (LessonBody / CfStreamPlayer), bypassing the published filter so
// drafts can be reviewed exactly as learners will see them. Admin-only.
import { redirect, notFound } from "next/navigation";
import { assertLmsAdmin } from "@/lib/lms/admin-auth";
import { getAdminLesson } from "@/lib/lms/admin-queries";
import { LessonBody } from "@/lib/lms/renderer";
import { CfStreamPlayer } from "@/components/lms/cf-stream-player";
import type { TipTapDoc } from "@/lib/lms/types";

export const dynamic = "force-dynamic";

function extractVideoId(doc: TipTapDoc): string | null {
  const first = doc.content?.[0];
  if (first?.type === "video") return first.attrs.cfStreamVideoId ?? null;
  return null;
}

export default async function LessonPreviewPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  if (!(await assertLmsAdmin())) redirect("/dashboard");
  const { lessonId } = await params;
  const lesson = await getAdminLesson(lessonId);
  if (!lesson) notFound();

  const isVideo = lesson.lesson_type === "video";
  const videoId = isVideo
    ? extractVideoId(lesson.body) ?? lesson.cf_stream_video_id
    : null;

  return (
    <div className="-mx-8 -my-6 bg-white min-h-screen">
      {!lesson.is_published && (
        <div className="bg-amber-100 text-amber-800 text-sm text-center py-2 px-4 font-medium">
          Vorschau · Diese Lektion ist noch nicht veröffentlicht (Entwurf).
        </div>
      )}
      <header className="bg-[#FAEBE1]">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <h1 className="text-4xl font-bold leading-tight uppercase tracking-tight">
            {lesson.title}
          </h1>
        </div>
      </header>

      {isVideo ? (
        <div className="bg-black">
          <CfStreamPlayer videoId={videoId} />
        </div>
      ) : (
        <div className="py-10">
          <LessonBody doc={lesson.body} />
        </div>
      )}
    </div>
  );
}
