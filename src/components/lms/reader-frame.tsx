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
import type { LmsCourseTree } from "@/lib/lms/types";

type Props = {
  tree: LmsCourseTree;
  currentLessonHref: string | null;
  prevHref: string | null;
  nextHref: string | null;
  children: React.ReactNode;
};

const STORAGE_KEY = "ephia-lms-sidebar-collapsed";

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

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      {/* Sidebar — hidden on desktop when collapsed. Mobile keeps it
          visible (collapse toggle is desktop-only). */}
      <aside
        className={
          "w-full bg-white md:sticky md:top-0 md:self-start md:max-h-screen md:overflow-y-auto md:shadow-[4px_0_16px_rgba(0,0,0,0.06)] z-10 " +
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

      {/* Content */}
      <main className="flex-1 min-w-0 bg-white">
        <div className="border-b border-black/10 bg-white relative">
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

        {/* Page content (rose title strip + body, owned by the page). */}
        {children}
      </main>
    </div>
  );
}
