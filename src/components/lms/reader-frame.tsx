// Two-column reader frame: white sidebar with blue header on the
// left, white content area on the right. Rose is reserved for the
// lesson-title banner inside the page (rendered by the page itself,
// not by the frame), matching the LW reference.
//
// Client component: holds the sidebar collapse state. Uses
// localStorage so the user's preference persists across lesson
// navigation. The TOC content is small and fully serializable, so
// flipping this client-side has no real cost.
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import type { LmsCourseTree } from "@/lib/lms/types";

type Props = {
  tree: LmsCourseTree;
  currentLessonHref: string | null;
  currentLessonTitle: string | null;
  prevHref: string | null;
  prevTitle: string | null;
  nextHref: string | null;
  nextTitle: string | null;
  children: React.ReactNode;
};

const STORAGE_KEY = "ephia-lms-sidebar-collapsed";

// Special chapter slug that gets pulled out of the regular sidebar
// list and rendered as a prominent CTA button at the bottom (the
// quiz / test). The chapter's first lesson is the link target.
const TEST_CHAPTER_SLUG = "teste-dein-wissen";

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
  currentLessonTitle,
  prevHref,
  prevTitle,
  nextHref,
  nextTitle,
  children,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

  // Hydrate from localStorage on mount. There's a brief flash of the
  // expanded state before this fires; acceptable for now (avoids the
  // need for a blocking inline script).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "true") setCollapsed(true);
    } catch {
      // localStorage may be unavailable (private mode, restrictive
      // settings) — fall back to default.
    }
  }, []);

  function toggle(next: boolean) {
    setCollapsed(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      /* ignore */
    }
  }

  // Expose the current sidebar width as a CSS variable on the root
  // element so fixed-position descendants (the figure lightbox) can
  // start at the right edge of the sidebar instead of covering it.
  // 0 on mobile (sidebar stacks above main) and when collapsed; 320px
  // on desktop with the sidebar expanded.
  useEffect(() => {
    const apply = () => {
      const isDesktop = window.matchMedia("(min-width: 768px)").matches;
      const offset = isDesktop && !collapsed ? 320 : 0;
      document.documentElement.style.setProperty(
        "--lms-sidebar-width",
        `${offset}px`,
      );
    };
    apply();
    const mq = window.matchMedia("(min-width: 768px)");
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      document.documentElement.style.removeProperty("--lms-sidebar-width");
    };
  }, [collapsed]);

  return (
    <div className="min-h-screen md:h-screen flex flex-col md:flex-row bg-white">
      {/* Sidebar — hidden on desktop when collapsed. Mobile keeps it
          visible (collapse toggle is desktop-only). */}
      <aside
        className={
          "w-full bg-white md:sticky md:top-0 md:self-start md:max-h-screen md:overflow-y-auto md:shadow-[4px_0_16px_rgba(0,0,0,0.06)] z-50 " +
          (collapsed ? "md:hidden" : "md:w-[320px] md:min-h-screen")
        }
      >
        <div className="bg-[#0066FF] text-white px-6 py-7">
          <div className="flex items-start justify-between gap-3">
            <Link
              href="/"
              className="text-xs uppercase tracking-wide opacity-80 hover:opacity-100"
            >
              ← Alle Kurse
            </Link>
            <button
              type="button"
              onClick={() => toggle(true)}
              className="hidden md:inline-flex h-10 w-10 items-center justify-center text-white hover:bg-white/15 rounded-full transition-colors text-2xl leading-none -mr-1"
              aria-label="Sidebar einklappen"
              title="Sidebar einklappen"
            >
              «
            </button>
          </div>
          <h1 className="mt-3 text-xl font-bold leading-snug">{tree.title}</h1>
        </div>

        <nav className="px-3 py-5">
          {tree.chapters
            .filter((ch) => ch.slug !== TEST_CHAPTER_SLUG)
            .map((ch, ci) => (
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

          {/* Test chapter rendered as a single prominent CTA button
              instead of the regular chapter list, so the quiz feels
              like a clear endgame action rather than another lesson. */}
          {(() => {
            const testCh = tree.chapters.find(
              (ch) => ch.slug === TEST_CHAPTER_SLUG,
            );
            const testLesson = testCh?.lessons[0];
            if (!testCh || !testLesson) return null;
            const href = lessonHref(tree.slug, testCh.slug, testLesson.slug);
            const isActive = href === currentLessonHref;
            return (
              <div className="mt-6 px-3">
                <Link
                  href={href}
                  className={
                    "flex items-center justify-center gap-2 w-full px-4 py-3 rounded-[10px] font-bold text-sm transition-colors " +
                    (isActive
                      ? "bg-[#0055DD] text-white"
                      : "bg-[#0066FF] hover:bg-[#0055DD] text-white")
                  }
                >
                  <Trophy className="w-4 h-4" strokeWidth={2.25} />
                  <span>{testCh.title}</span>
                  <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
                </Link>
              </div>
            );
          })()}
        </nav>
      </aside>

      {/* Content. Desktop locks to viewport height with internal
          scroll so dedicated video pages can fit perfectly without
          page-level scroll, while text content longer than the
          viewport still scrolls cleanly. Mobile keeps natural flow. */}
      <main className="flex-1 min-w-0 bg-white md:flex md:flex-col md:overflow-y-auto">
        <div className="border-b border-black/10 bg-white/85 backdrop-blur-md sticky top-0 z-50">
          {/* Expand button shows up only on desktop when sidebar is
              collapsed. Absolute-positioned so it doesn't reflow the
              centered Zurück/Weiter row. */}
          {collapsed ? (
            <button
              type="button"
              onClick={() => toggle(false)}
              className="hidden md:inline-flex absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center bg-[#0066FF] hover:bg-[#0055DD] text-white rounded-full transition-colors text-2xl leading-none shadow-md"
              aria-label="Sidebar ausklappen"
              title="Sidebar ausklappen"
            >
              »
            </button>
          ) : null}
          <div className="max-w-4xl mx-auto h-14 px-6 flex items-center gap-3">
            {prevHref ? (
              <Link
                href={prevHref}
                title={prevTitle ?? undefined}
                className="group inline-flex items-center gap-1.5 px-3 py-1.5 -mx-3 -my-1.5 rounded-full text-sm font-medium text-black/70 hover:text-[#0066FF] hover:bg-black/5 transition-colors flex-shrink-0"
              >
                <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" strokeWidth={2.5} />
                <span>Zurück</span>
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-black/25 flex-shrink-0">
                <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
                <span>Zurück</span>
              </span>
            )}

            <div className="flex-1 text-center text-sm font-semibold text-black/80 truncate min-w-0">
              {currentLessonTitle ?? ""}
            </div>

            {nextHref ? (
              <Link
                href={nextHref}
                title={nextTitle ?? undefined}
                className="group inline-flex items-center gap-1.5 px-3 py-1.5 -mx-3 -my-1.5 rounded-full text-sm font-medium text-black/70 hover:text-[#0066FF] hover:bg-black/5 transition-colors flex-shrink-0"
              >
                <span>Weiter</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-black/25 flex-shrink-0">
                <span>Weiter</span>
                <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
              </span>
            )}
          </div>
        </div>

        {/* Page content (rose title strip + body, owned by the page). */}
        {children}
      </main>
    </div>
  );
}
