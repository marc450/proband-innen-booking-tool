// Lesson editor: metadata + validated JSON body (Phase A). The block
// editor replaces the raw JSON textarea in Phase B. Admin-only.
import { redirect, notFound } from "next/navigation";
import { assertLmsAccess } from "@/lib/lms/admin-auth";
import { getAdminLesson, getAdminLessonContext } from "@/lib/lms/admin-queries";
import { LessonEditor } from "./lesson-editor";

export const dynamic = "force-dynamic";

export default async function LessonEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await assertLmsAccess())) redirect("/dashboard");
  const { id } = await params;
  const lesson = await getAdminLesson(id);
  if (!lesson) notFound();
  const { chapter, course } = await getAdminLessonContext(lesson);

  return (
    <LessonEditor
      lesson={lesson}
      breadcrumb={{
        courseTitle: course?.title ?? null,
        chapterTitle: chapter?.title ?? null,
      }}
    />
  );
}
