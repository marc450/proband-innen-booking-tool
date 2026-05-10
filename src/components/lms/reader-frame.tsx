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
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Menu, Trophy, X } from "lucide-react";
import type { LmsCourseTree, QuizQuestion } from "@/lib/lms/types";
import { QuizBlock } from "@/components/lms/quiz-block";

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
  const [testModalOpen, setTestModalOpen] = useState(false);
  // Mobile-only drawer state. Desktop has its own `collapsed` state with
  // localStorage persistence; this one is ephemeral so a refresh on mobile
  // always lands on the lesson, not the navigation.
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Single-open accordion for chapters. Default = null (all collapsed); the
  // chapter holding the current lesson auto-opens via the effect below so
  // the user always sees their position in context.
  const [openChapterId, setOpenChapterId] = useState<string | null>(null);

  // Identify which chapter contains the active lesson so we can auto-open
  // it on first render and on lesson navigation.
  const activeChapterId = useMemo(() => {
    if (!currentLessonHref) return null;
    for (const ch of tree.chapters) {
      const hit = ch.lessons.some(
        (l) => lessonHref(tree.slug, ch.slug, l.slug) === currentLessonHref,
      );
      if (hit) return ch.id;
    }
    return null;
  }, [tree, currentLessonHref]);

  useEffect(() => {
    if (activeChapterId) setOpenChapterId(activeChapterId);
  }, [activeChapterId]);

  // Close the mobile drawer whenever the user navigates to a different
  // lesson. Next-link navigation is client-side so component state would
  // otherwise persist and leave the drawer covering the new lesson.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentLessonHref]);

  // Lock body scroll + ESC-to-close while the mobile drawer is open.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  // Lock body scroll + ESC-to-close while the test modal is open.
  useEffect(() => {
    if (!testModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTestModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [testModalOpen]);

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
      {/* Sidebar.
          • Desktop (md+): sticky column on the left, hidden when `collapsed`.
          • Mobile: hidden by default; opens as a fullscreen drawer when the
            top-bar hamburger sets `mobileMenuOpen`. The drawer takes over the
            viewport so no separate backdrop is needed.
          Using max-md: + md: variants keeps mobile and desktop styles in
          disjoint media queries so they never have to override each other. */}
      <aside
        className={
          // z-[60] beats the lesson topbar's z-50 so the mobile drawer
          // covers it instead of being covered by it. Doesn't matter on
          // desktop where the two never overlap.
          "bg-white z-[60] " +
          // Mobile (< md)
          (mobileMenuOpen
            ? "max-md:fixed max-md:inset-0 max-md:overflow-y-auto "
            : "max-md:hidden ") +
          // Desktop (md+)
          (collapsed
            ? "md:hidden"
            : "md:w-[320px] md:min-h-screen md:sticky md:top-0 md:self-start md:max-h-screen md:overflow-y-auto md:shadow-[4px_0_16px_rgba(0,0,0,0.06)]")
        }
      >
        <div className="bg-[#0066FF] text-white px-6 py-7">
          <div className="flex items-start justify-between gap-3">
            <Link
              href="https://ephia.de/grundkurs-botulinum"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs uppercase tracking-wide opacity-80 hover:opacity-100"
            >
              <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>Zum Grundkurs Botulinum</span>
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
            {/* Mobile drawer close. Parallels the desktop collapse button so
                the user has a clear way out without tapping a backdrop. */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden h-10 w-10 inline-flex items-center justify-center text-white hover:bg-white/15 rounded-full transition-colors -mr-1"
              aria-label="Menü schliessen"
            >
              <X className="w-5 h-5" strokeWidth={2.25} />
            </button>
          </div>
          <h1 className="mt-3 text-xl font-bold leading-snug">{tree.title}</h1>
        </div>

        <nav className="px-3 py-5">
          {tree.chapters
            .filter((ch) => ch.slug !== TEST_CHAPTER_SLUG)
            .map((ch, ci) => {
              const isOpen = openChapterId === ch.id;
              return (
                <div key={ch.id} className="mb-4">
                  <button
                    type="button"
                    onClick={() => setOpenChapterId(isOpen ? null : ch.id)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-1 text-sm font-semibold text-[#0066FF] hover:bg-[#0066FF]/5 rounded-[10px] transition-colors"
                    aria-expanded={isOpen}
                  >
                    <span className="text-left">
                      {ci + 1}. {ch.title}
                    </span>
                    <ChevronDown
                      className={
                        "w-4 h-4 flex-shrink-0 transition-transform " +
                        (isOpen ? "rotate-0" : "-rotate-90")
                      }
                      strokeWidth={2.5}
                    />
                  </button>
                  {isOpen ? (
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
                  ) : null}
                </div>
              );
            })}

          {/* Test chapter rendered as a single prominent CTA button
              that opens the quiz in a modal overlay. The
              corresponding lesson page still exists at its URL as a
              fallback for direct links, but the sidebar entry never
              navigates away from the user's current lesson. */}
          {(() => {
            const testCh = tree.chapters.find(
              (ch) => ch.slug === TEST_CHAPTER_SLUG,
            );
            const testLesson = testCh?.lessons[0];
            if (!testCh || !testLesson) return null;
            return (
              <div className="mt-6 px-3">
                <button
                  type="button"
                  onClick={() => setTestModalOpen(true)}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-[10px] font-bold text-sm transition-colors bg-[#0066FF] hover:bg-[#0055DD] text-white"
                >
                  <Trophy className="w-4 h-4" strokeWidth={2.25} />
                  <span>{testCh.title}</span>
                  <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
                </button>
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
          {/* Mobile-only hamburger. Same absolute slot so the centered
              lesson title in the row below stays centered. */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 inline-flex items-center justify-center text-black/70 hover:text-black hover:bg-black/5 rounded-full transition-colors"
            aria-label="Menü öffnen"
          >
            <Menu className="w-5 h-5" strokeWidth={2.25} />
          </button>
          {/* pl-14 reserves space for the absolute-positioned hamburger
              (mobile, always) and the desktop expand button (when collapsed).
              Desktop with the sidebar visible has no left-edge button, so we
              reclaim that space with md:pl-6 in the non-collapsed case. */}
          <div
            className={
              "max-w-4xl mx-auto h-14 pl-16 pr-6 flex items-center gap-3 " +
              (collapsed ? "" : "md:pl-6")
            }
          >
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

      {/* Quiz modal — opens from the sidebar CTA. Renders the quiz
          node attrs from the test lesson's body so the question set
          stays editable from the DB without code changes. */}
      {testModalOpen ? (
        (() => {
          const testCh = tree.chapters.find(
            (ch) => ch.slug === TEST_CHAPTER_SLUG,
          );
          const testLesson = testCh?.lessons[0];
          const quizNode = testLesson?.body?.content?.find(
            (n) => n.type === "quiz",
          );
          if (!testCh || !quizNode || quizNode.type !== "quiz") return null;
          return (
            <div
              role="dialog"
              aria-modal="true"
              aria-label={testCh.title}
              onClick={() => setTestModalOpen(false)}
              className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 md:p-8"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-3xl bg-white rounded-[10px] shadow-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="sticky top-0 z-10 bg-white border-b border-black/10 px-6 py-4 flex items-center justify-between gap-3">
                  <h2 className="text-xl font-bold text-black truncate">
                    {testCh.title}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setTestModalOpen(false)}
                    className="flex-shrink-0 inline-flex items-center justify-center h-9 w-9 text-black/60 hover:text-black hover:bg-black/5 rounded-full transition-colors"
                    aria-label="Schliessen"
                  >
                    <X className="w-5 h-5" strokeWidth={2.25} />
                  </button>
                </div>
                <div className="px-6 py-6">
                  <QuizBlock
                    questions={quizNode.attrs.questions as QuizQuestion[]}
                    grundkursUrl={quizNode.attrs.grundkursUrl}
                    timePerQuestionSeconds={
                      quizNode.attrs.timePerQuestionSeconds
                    }
                  />
                </div>
              </div>
            </div>
          );
        })()
      ) : null}
    </div>
  );
}
