// Two-column reader frame: white sidebar with blue header on the
// left, white content area on the right. Rose is reserved for the
// lesson-title banner inside the page (rendered by the page itself,
// not by the frame), matching the LW reference.
//
// Server component. The active-state highlight comes from comparing
// the current pathname against each lesson's href, which is passed in
// as a prop so this stays free of usePathname.
import Link from "next/link";
import type { LmsCourseTree } from "@/lib/lms/types";

type Props = {
  tree: LmsCourseTree;
  currentLessonHref: string | null;
  prevHref: string | null;
  nextHref: string | null;
  children: React.ReactNode;
};

function lessonHref(courseSlug: string, chapterSlug: string, lessonSlug: string) {
  return `/${courseSlug}/${chapterSlug}/${lessonSlug}`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ReaderFrame({
  tree,
  currentLessonHref,
  prevHref,
  nextHref,
  children,
}: Props) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      {/* Sidebar — white below, blue header on top. Sticky on desktop
          so the TOC stays visible while the content scrolls. */}
      <aside className="w-full md:w-[320px] md:min-h-screen bg-white md:sticky md:top-0 md:self-start md:max-h-screen md:overflow-y-auto md:shadow-[4px_0_16px_rgba(0,0,0,0.06)] z-10">
        <div className="bg-[#0066FF] text-white px-6 py-7">
          <Link href="/" className="text-xs uppercase tracking-wide opacity-80 hover:opacity-100">
            ← Alle Kurse
          </Link>
          <h1 className="mt-3 text-xl font-bold leading-snug">{tree.title}</h1>
        </div>

        <nav className="px-3 py-5">
          {tree.chapters.map((ch, ci) => (
            <div key={ch.id} className="mb-4">
              <div className="px-3 py-1 text-sm font-semibold text-[#0066FF]">
                {ci + 1}. {ch.title}
              </div>
              <ul className="mt-1">
                {ch.lessons.map((l) => {
                  const href = lessonHref(tree.slug, ch.slug, l.slug);
                  const isActive = href === currentLessonHref;
                  return (
                    <li key={l.id}>
                      <Link
                        href={href}
                        className={
                          "flex items-start gap-2 px-3 py-2 rounded-[10px] transition-colors " +
                          (isActive
                            ? "bg-[#E0E5E9] text-black"
                            : "text-black/80 hover:bg-[#E0E5E9]/60")
                        }
                      >
                        <span aria-hidden className="mt-[3px] text-[#0066FF]">
                          {l.lesson_type === "video" ? "▶" : "≡"}
                        </span>
                        <span className="flex-1">
                          <span className="block text-sm font-medium leading-snug">
                            {l.title}
                          </span>
                          {l.duration_seconds ? (
                            <span className="block text-xs text-black/50 mt-0.5">
                              {formatDuration(l.duration_seconds)}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Content. flex-col + min-h-screen so a child with flex-1 (e.g.
          a fullscreen video player) can fill the remaining vertical
          space below the top nav. Text lessons still grow naturally
          with their content. */}
      <main className="flex-1 min-w-0 bg-white flex flex-col md:min-h-screen">
        <div className="border-b border-black/10 bg-white">
          <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between text-sm">
            {prevHref ? (
              <Link href={prevHref} className="text-black/70 hover:text-black">
                ‹ Zurück
              </Link>
            ) : (
              <span className="text-black/30">‹ Zurück</span>
            )}
            {nextHref ? (
              <Link href={nextHref} className="text-black/70 hover:text-black">
                Weiter ›
              </Link>
            ) : (
              <span className="text-black/30">Weiter ›</span>
            )}
          </div>
        </div>

        {/* Page content. Pages are responsible for their own
            title banner + body wrapping so they can choose where the
            rose accent strip ends. */}
        {children}
      </main>
    </div>
  );
}
