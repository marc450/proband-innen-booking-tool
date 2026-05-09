// study.ephia.de/{courseSlug}  → redirect straight to the first lesson.
// No course landing page; we want users to land in the content
// immediately. The course slug URL stays valid (returns a 307 instead
// of a 404) so existing inbound links keep working.
import { redirect, notFound } from "next/navigation";
import { getCourseTreeBySlug, flattenLessons } from "@/lib/lms/queries";

export default async function CourseEntryRedirect({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const tree = await getCourseTreeBySlug(courseSlug);
  if (!tree) notFound();
  const first = flattenLessons(tree)[0];
  if (!first) notFound();
  redirect(`/${tree.slug}/${first.chapter.slug}/${first.lesson.slug}`);
}
