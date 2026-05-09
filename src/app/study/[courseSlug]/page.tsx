// study.ephia.de/{courseSlug}  → course landing. Shows the course
// title + intro and a "Jetzt starten" CTA that jumps into the first
// lesson.
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCourseTreeBySlug, flattenLessons } from "@/lib/lms/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}): Promise<Metadata> {
  const { courseSlug } = await params;
  const tree = await getCourseTreeBySlug(courseSlug);
  if (!tree) return { title: "EPHIA Lernzentrum" };
  return {
    title: `${tree.title} | EPHIA`,
    description: tree.description ?? tree.subtitle ?? undefined,
  };
}

export default async function CourseLandingPage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const tree = await getCourseTreeBySlug(courseSlug);
  if (!tree) notFound();

  const flat = flattenLessons(tree);
  const firstLesson = flat[0];
  const totalSeconds = flat.reduce(
    (acc, { lesson }) => acc + (lesson.duration_seconds ?? 0),
    0,
  );
  const totalMinutes = Math.round(totalSeconds / 60);

  return (
    <div className="min-h-screen bg-[#FAEBE1]">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-black/60 hover:text-black">
          ← Alle Kurse
        </Link>
        <h1 className="mt-4 text-4xl font-bold leading-tight">{tree.title}</h1>
        {tree.subtitle ? (
          <p className="mt-2 text-lg text-[#733D29]">{tree.subtitle}</p>
        ) : null}

        {tree.description ? (
          <p className="mt-6 text-[1.1rem] leading-[1.65] text-black/85 whitespace-pre-line">
            {tree.description}
          </p>
        ) : null}

        {firstLesson ? (
          <div className="mt-10">
            <Link
              href={`/${tree.slug}/${firstLesson.chapter.slug}/${firstLesson.lesson.slug}`}
              className="inline-block bg-[#0066FF] text-white font-bold px-[25px] py-[15px] rounded-[10px] text-[1.6rem] leading-none hover:bg-[#0055DD] transition-colors"
            >
              Jetzt starten
            </Link>
            {totalMinutes > 0 ? (
              <p className="mt-3 text-sm text-black/60">
                Gesamtdauer ca. {totalMinutes} Min.
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Inhaltsverzeichnis */}
        <section className="mt-14">
          <h2 className="text-2xl font-bold">Inhalt</h2>
          <div className="mt-5 space-y-6">
            {tree.chapters.map((ch, ci) => (
              <div key={ch.id}>
                <h3 className="text-base font-semibold text-[#0066FF]">
                  {ci + 1}. {ch.title}
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {ch.lessons.map((l) => (
                    <li key={l.id}>
                      <Link
                        href={`/${tree.slug}/${ch.slug}/${l.slug}`}
                        className="text-black/85 hover:text-[#0066FF]"
                      >
                        {l.lesson_type === "video" ? "▶" : "≡"} {l.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
