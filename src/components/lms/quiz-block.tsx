// Interactive multi-question quiz with countdown per question.
//
// Stages: intro → question (×N) → result. After "Test starten" the
// timer ticks down once per second and auto-advances when it hits 0.
// Selecting an option locks it in; advancing is one-way (no review).
// Perfect score reveals a static coupon code passed in via attrs.
//
// Anti-cheat is intentionally light — 30 s default per question is
// short enough to deter casual ChatGPT lookups but generous for
// readers who actually went through the lessons. The 5% reward isn't
// worth aggressive lockdowns that punish honest users.
"use client";

import { useEffect, useState } from "react";
import { Check, X, Trophy, Clock } from "lucide-react";
import type { QuizQuestion } from "@/lib/lms/types";

type Props = {
  questions: QuizQuestion[];
  passCouponCode?: string;
  voucherLabel?: string;
  grundkursUrl?: string;
  timePerQuestionSeconds?: number;
};

type Stage = "intro" | "question" | "result";

export function QuizBlock({
  questions,
  passCouponCode,
  voucherLabel = "Gutschein",
  grundkursUrl,
  timePerQuestionSeconds = 30,
}: Props) {
  const [stage, setStage] = useState<Stage>("intro");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => questions.map(() => null),
  );
  const [timeLeft, setTimeLeft] = useState(timePerQuestionSeconds);

  // Tick the timer once per second while a question is active.
  // When it reaches 0, auto-advance whether or not the user picked
  // an answer (null answer counts as wrong).
  useEffect(() => {
    if (stage !== "question") return;
    if (timeLeft <= 0) {
      handleAdvance();
      return;
    }
    const t = setTimeout(() => setTimeLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, currentIdx, timeLeft]);

  function start() {
    setStage("question");
    setCurrentIdx(0);
    setAnswers(questions.map(() => null));
    setTimeLeft(timePerQuestionSeconds);
  }

  function selectOption(optionIdx: number) {
    if (answers[currentIdx] !== null) return; // already locked
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIdx] = optionIdx;
      return next;
    });
  }

  function handleAdvance() {
    if (currentIdx >= questions.length - 1) {
      setStage("result");
    } else {
      setCurrentIdx((i) => i + 1);
      setTimeLeft(timePerQuestionSeconds);
    }
  }

  const score = questions.reduce((acc, q, i) => {
    const ans = answers[i];
    return acc + (ans !== null && q.options[ans]?.correct ? 1 : 0);
  }, 0);
  const passed = score === questions.length;

  if (stage === "intro") {
    return (
      <section className="bg-[#FAEBE1] rounded-[10px] px-8 py-10 my-10">
        <h2 className="text-2xl font-bold text-black">Mache jetzt den Test</h2>
        <p className="mt-3 text-[1.05rem] leading-[1.65] text-black/85 max-w-xl">
          {questions.length} Fragen zum gerade Gelernten. Du hast{" "}
          {timePerQuestionSeconds} Sekunden pro Frage. Beantworte alle richtig
          und Du bekommst einen {voucherLabel} für unseren Grundkurs Botulinum.
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
      <section className="bg-[#FAEBE1] rounded-[10px] px-8 py-10 my-10">
        <div className="flex items-center gap-3">
          <Trophy
            className={passed ? "w-8 h-8 text-[#0066FF]" : "w-8 h-8 text-black/40"}
            strokeWidth={2}
          />
          <h2 className="text-2xl font-bold text-black">
            {passed ? "Perfekt, Du hast es geschafft!" : "Knapp daneben."}
          </h2>
        </div>
        <p className="mt-3 text-[1.05rem] leading-[1.65] text-black/85">
          Du hast{" "}
          <strong>
            {score} von {questions.length}
          </strong>{" "}
          Fragen richtig beantwortet.
        </p>

        {passed && passCouponCode ? (
          <div className="mt-6 bg-white rounded-[10px] px-6 py-5">
            <p className="text-sm text-black/60 uppercase tracking-wide">
              Dein {voucherLabel}
            </p>
            <p className="mt-1 font-mono text-3xl font-bold text-[#0066FF]">
              {passCouponCode}
            </p>
            <p className="mt-3 text-sm text-black/70">
              Verwende den Code beim Checkout des Grundkurs Botulinum.
            </p>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          {grundkursUrl ? (
            <a
              href={grundkursUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center bg-[#0066FF] hover:bg-[#0055DD] text-white font-bold text-base px-6 py-3 rounded-[10px] transition-colors"
            >
              Zum Grundkurs Botulinum →
            </a>
          ) : null}
          <button
            type="button"
            onClick={start}
            className="inline-flex items-center bg-white hover:bg-black/5 text-black font-medium text-base px-6 py-3 rounded-[10px] transition-colors"
          >
            Nochmal versuchen
          </button>
        </div>
      </section>
    );
  }

  // stage === "question"
  const q = questions[currentIdx];
  const selectedIdx = answers[currentIdx];
  const isLocked = selectedIdx !== null;

  return (
    <section className="my-10">
      {/* Progress + timer */}
      <div className="flex items-center justify-between text-sm text-black/60 mb-2">
        <span>
          Frage {currentIdx + 1} von {questions.length}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="w-4 h-4" strokeWidth={2.25} />
          {timeLeft}s
        </span>
      </div>
      <div className="h-1.5 bg-black/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#0066FF] transition-[width] duration-1000 ease-linear"
          style={{
            width: `${(timeLeft / timePerQuestionSeconds) * 100}%`,
          }}
        />
      </div>

      <h3 className="mt-6 text-xl font-bold text-black leading-snug">
        {q.question}
      </h3>

      <ul className="mt-5 space-y-2.5">
        {q.options.map((opt, i) => {
          const isSelected = selectedIdx === i;
          const isCorrectAnswer = opt.correct;
          // Once locked, show correct in green and the user's wrong
          // pick in red. Unselected options gray out.
          let cls =
            "w-full text-left px-5 py-4 rounded-[10px] border transition-colors text-[1.02rem] leading-snug ";
          if (!isLocked) {
            cls +=
              "border-black/10 bg-white hover:bg-black/5 cursor-pointer";
          } else if (isSelected && isCorrectAnswer) {
            cls += "border-emerald-400 bg-emerald-50 text-black";
          } else if (isSelected && !isCorrectAnswer) {
            cls += "border-red-400 bg-red-50 text-black";
          } else if (isCorrectAnswer) {
            cls += "border-emerald-400 bg-emerald-50/60 text-black";
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
                  {isLocked ? (
                    <span
                      aria-hidden
                      className={
                        "flex-shrink-0 mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full " +
                        (isCorrectAnswer
                          ? "bg-emerald-500 text-white"
                          : isSelected
                          ? "bg-red-500 text-white"
                          : "bg-black/10 text-black/30")
                      }
                    >
                      {isCorrectAnswer ? (
                        <Check className="w-3 h-3" strokeWidth={3} />
                      ) : isSelected ? (
                        <X className="w-3 h-3" strokeWidth={3} />
                      ) : null}
                    </span>
                  ) : (
                    <span
                      aria-hidden
                      className="flex-shrink-0 mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full border border-black/30"
                    />
                  )}
                  <span className="flex-1">{opt.text}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {isLocked ? (
        <button
          type="button"
          onClick={handleAdvance}
          className="mt-6 inline-flex items-center bg-[#0066FF] hover:bg-[#0055DD] text-white font-bold text-base px-6 py-3 rounded-[10px] transition-colors"
        >
          {currentIdx >= questions.length - 1 ? "Test abschliessen" : "Weiter"}
        </button>
      ) : null}
    </section>
  );
}
