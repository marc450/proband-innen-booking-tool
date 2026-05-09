// study.ephia.de/  → course hub. Lists every published course.
import Link from "next/link";
import type { Metadata } from "next";
import { listPublishedCourses } from "@/lib/lms/queries";

export const metadata: Metadata = {
  title: "EPHIA Lernzentrum",
  description: "Kostenlose Tutorials und Online-Kurse der EPHIA Akademie für Ärzt:innen.",
};

export default async function StudyHubPage() {
  const courses = await listPublishedCourses();

  return (
    <div className="min-h-screen bg-[#FAEBE1]">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold leading-tight">EPHIA Lernzentrum</h1>
        <p className="mt-3 text-[1.1rem] text-black/70 max-w-2xl">
          Kostenlose Tutorials und Online-Kurse für Ärzt:innen, die ästhetische Medizin verantwortungsvoll lernen wollen.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {courses.map((c) => (
            <Link
              key={c.id}
              href={`/${c.slug}`}
              className="bg-white rounded-[10px] p-6 shadow-md hover:shadow-lg transition-shadow"
            >
              <h2 className="text-xl font-bold">{c.title}</h2>
              {c.subtitle ? (
                <p className="mt-1 text-sm text-[#733D29]">{c.subtitle}</p>
              ) : null}
              {c.description ? (
                <p className="mt-3 text-[0.95rem] leading-[1.55] text-black/75 line-clamp-4">
                  {c.description}
                </p>
              ) : null}
            </Link>
          ))}
          {courses.length === 0 ? (
            <p className="text-black/60">Es sind noch keine Kurse veröffentlicht.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
