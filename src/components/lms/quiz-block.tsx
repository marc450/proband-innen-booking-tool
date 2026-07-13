// Interactive multi-question quiz.
//
// Stages: intro → question (×N) → result. Selecting an option locks it
// in; the next question slides in immediately (no static feedback
// pause; correct answer is never revealed). Result stage celebrates a
// perfect score and gently roasts anything below — both routes invite
// the user into the Grundkurs Botulinum.
//
// Anti-cheat is light — hidden correct answers, no review. Users can
// retake the quiz freely; we'd rather they leave satisfied than feel
// locked out.
"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import type { QuizQuestion } from "@/lib/lms/types";
import "./quiz-animations.css";

// Default result copy. Kept as the funnel end-cap for the free Botox
// tutorial; every field is overridable per quiz block from the editor
// so the same component can end on any course. Empty editor fields fall
// back to these.
export const DEFAULT_SUCCESS_TITLE = "Geschafft!";
export const DEFAULT_SUCCESS_BODY =
  "Wenn Du Dein Wissen jetzt in die Praxis bringen willst: im EPHIA Online-Grundkurs Botulinum lernst Du Anatomie, Indikationen, Technik und Komplikationsmanagement systematisch und mit echten Fallbeispielen.";
export const DEFAULT_FAIL_TITLE =
  "Knapp daneben. Botulinum verzeiht keine Annahmen.";
export const DEFAULT_FAIL_BODY =
  "Im EPHIA Online-Grundkurs Botulinum lernst Du Anatomie, Indikationen und Technik so präzise, dass beim nächsten Versuch hier nichts mehr daneben geht. Versprochen.";

type Props = {
  questions: QuizQuestion[];
  grundkursUrl?: string;
  successTitle?: string;
  successBody?: string;
  failTitle?: string;
  failBody?: string;
};

type Stage = "intro" | "question" | "result";

export function QuizBlock({
  questions,
  grundkursUrl,
  successTitle = DEFAULT_SUCCESS_TITLE,
  successBody = DEFAULT_SUCCESS_BODY,
  failTitle = DEFAULT_FAIL_TITLE,
  failBody = DEFAULT_FAIL_BODY,
}: Props) {
  const [stage, setStage] = useState<Stage>("intro");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => questions.map(() => null),
  );

  // Auto-advance: as soon as a question is locked, wait long enough for
  // the pop + checkmark animation on the picked option to play out, then
  // remount the next question (its key={currentIdx} replays the slide-in).
  // The 380ms covers the 360ms keyframe with a small breath at the end.
  useEffect(() => {
    if (stage !== "question") return;
    if (answers[currentIdx] === null) return;
    const t = setTimeout(() => {
      if (currentIdx >= questions.length - 1) {
        setStage("result");
      } else {
        setCurrentIdx((i) => i + 1);
      }
    }, 380);
    return () => clearTimeout(t);
  }, [stage, currentIdx, answers, questions.length]);

  function start() {
    setStage("question");
    setCurrentIdx(0);
    setAnswers(questions.map(() => null));
  }

  function selectOption(optionIdx: number) {
    if (answers[currentIdx] !== null) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIdx] = optionIdx;
      return next;
    });
  }

  const score = questions.reduce((acc, q, i) => {
    const ans = answers[i];
    return acc + (ans !== null && q.options[ans]?.correct ? 1 : 0);
  }, 0);
  const passed = score === questions.length;

  if (stage === "intro") {
    return (
      <section className="my-2">
        <p className="text-[1.05rem] leading-[1.65] text-black/85 max-w-xl">
          {questions.length} Fragen zum gerade Gelernten.
        </p>
        <button
          type="button"
          onClick={start}
          className="mt-6 inline-flex items-center bg-[#0066FF] hover:bg-[#0055DD] text-white font-bold text-base px-6 py-3 rounded-[10px] transition-colors"
        >
          Test starten
        </button>
      </section>
    );
  }

  if (stage === "result") {
    return (
      <section className="my-2">
        {passed ? (
          <div className="text-center py-6">
            {/* Bouncing trophy + pulsing sparkles. Kept emoji-driven
                so it works without any animation library. */}
            <div className="relative inline-block">
              <span
                aria-hidden
                className="absolute -top-4 -left-10 text-2xl animate-pulse"
                style={{ animationDelay: "0.2s" }}
              >
                ✨
              </span>
              <span
                aria-hidden
                className="absolute -top-2 -right-12 text-3xl animate-pulse"
                style={{ animationDelay: "0.5s" }}
              >
                🎉
              </span>
              <span
                aria-hidden
                className="absolute top-1 -left-14 text-xl animate-pulse"
                style={{ animationDelay: "0.8s" }}
              >
                ⭐
              </span>
              <span
                aria-hidden
                className="absolute -bottom-1 -left-9 text-lg animate-pulse"
                style={{ animationDelay: "1.1s" }}
              >
                ✨
              </span>
              <span
                aria-hidden
                className="absolute -bottom-3 -right-10 text-2xl animate-pulse"
                style={{ animationDelay: "0.4s" }}
              >
                ⭐
              </span>
              <span
                aria-hidden
                className="absolute top-3 -right-14 text-base animate-pulse"
                style={{ animationDelay: "0.9s" }}
              >
                ✨
              </span>
              <div className="text-7xl animate-bounce">🏆</div>
            </div>
            <h2 className="mt-8 text-4xl font-extrabold text-black">
              {successTitle}
            </h2>
            <p className="mt-3 text-[1.05rem] leading-[1.65] text-black/80 max-w-md mx-auto">
              Alle {questions.length} Fragen richtig.
            </p>
            <p className="mt-2 text-[1.05rem] leading-[1.65] text-black/80 max-w-md mx-auto whitespace-pre-line">
              {successBody}
            </p>
            {grundkursUrl ? (
              <div className="mt-8 flex justify-center">
                <a
                  href={grundkursUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#0066FF] hover:bg-[#0055DD] text-white font-bold text-base px-6 py-3 rounded-[10px] transition-colors"
                >
                  <span>Zum Grundkurs Botulinum</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                </a>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="py-2">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-extrabold text-black tabular-nums">
                {score}
              </span>
              <span className="text-2xl font-semibold text-black/40">
                / {questions.length}
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-bold text-black leading-snug whitespace-pre-line">
              {failTitle}
            </h2>
            <p className="mt-3 text-[1.05rem] leading-[1.65] text-black/85 max-w-xl whitespace-pre-line">
              {failBody}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {grundkursUrl ? (
                <a
                  href={grundkursUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#0066FF] hover:bg-[#0055DD] text-white font-bold text-base px-6 py-3 rounded-[10px] transition-colors"
                >
                  <span>Zum Grundkurs Botulinum</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                </a>
              ) : null}
              <button
                type="button"
                onClick={start}
                className="inline-flex items-center text-black/70 hover:text-black font-medium text-sm px-4 py-3 rounded-[10px] transition-colors"
              >
                Nochmal versuchen
              </button>
            </div>
          </div>
        )}
      </section>
    );
  }

  // stage === "question"
  const q = questions[currentIdx];
  const selectedIdx = answers[currentIdx];
  const isLocked = selectedIdx !== null;

  return (
    <section
      // key on currentIdx remounts the section per question, so
      // tw-animate-css's enter classes replay each time.
      key={currentIdx}
      className="my-10 animate-in slide-in-from-right-12 fade-in duration-300"
    >
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-black/60 mb-2">
        <span>
          Frage {currentIdx + 1} von {questions.length}
        </span>
      </div>
      <div className="h-1.5 bg-black/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#0066FF] transition-[width] duration-300 ease-out"
          style={{
            width: `${((currentIdx + 1) / questions.length) * 100}%`,
          }}
        />
      </div>

      <h3 className="mt-6 text-xl font-bold text-black leading-snug">
        {q.question}
      </h3>

      <ul className="mt-5 space-y-2.5">
        {q.options.map((opt, i) => {
          const isSelected = selectedIdx === i;
          // After lock we only highlight the user's pick; correctness
          // is intentionally not revealed so the user can't memorise
          // the right answer for a retry.
          let cls =
            "w-full text-left px-5 py-4 rounded-[10px] border transition-colors text-[1.02rem] leading-snug ";
          if (!isLocked) {
            cls +=
              "border-black/10 bg-white hover:bg-black/5 cursor-pointer";
          } else if (isSelected) {
            // .quiz-option--picked plays the one-shot pop animation defined
            // in quiz-animations.css the moment this class lands.
            cls += "border-[#0066FF] bg-[#0066FF]/5 text-black quiz-option--picked";
          } else {
            cls += "border-black/10 bg-white text-black/40";
          }
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => selectOption(i)}
                disabled={isLocked}
                className={cls}
              >
                <span className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className={
                      "flex-shrink-0 mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full transition-colors " +
                      (isLocked && isSelected
                        ? "bg-[#0066FF]"
                        : "border border-black/30")
                    }
                  >
                    {isLocked && isSelected ? (
                      <Check
                        className="w-3 h-3 text-white quiz-check--popped"
                        strokeWidth={3.5}
                      />
                    ) : null}
                  </span>
                  <span className="flex-1">{opt.text}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
