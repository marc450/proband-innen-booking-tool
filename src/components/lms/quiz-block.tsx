// Interactive multi-question quiz with countdown per question.
//
// Stages: intro → question (×N) → result. After "Test starten" the
// timer ticks down once per second and auto-advances when it hits 0.
// Selecting an option locks it in; advancing is one-way (no review).
//
// On perfect score, a fresh single-use 50 € Stripe promo code (5-day
// expiry) is minted server-side via /api/lms/quiz-coupon, gated
// behind an email input. One code per email — re-entering the same
// email returns the existing active code.
//
// Anti-cheat is intentionally light — 30 s default per question is
// short enough to deter casual ChatGPT lookups but generous for
// readers who actually went through the lessons.
"use client";

import { useEffect, useState } from "react";
import { Check, X, Trophy, Clock, Mail } from "lucide-react";
import type { QuizQuestion } from "@/lib/lms/types";

type Props = {
  questions: QuizQuestion[];
  voucherLabel?: string;
  grundkursUrl?: string;
  timePerQuestionSeconds?: number;
};

type Stage = "intro" | "question" | "result";

type CouponState =
  | { kind: "gate" }
  | { kind: "requesting" }
  | { kind: "revealed"; code: string; expiresAt: string }
  | { kind: "error"; message: string };

export function QuizBlock({
  questions,
  voucherLabel = "Gutschein",
  grundkursUrl,
  timePerQuestionSeconds = 20,
}: Props) {
  const [stage, setStage] = useState<Stage>("intro");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => questions.map(() => null),
  );
  const [timeLeft, setTimeLeft] = useState(timePerQuestionSeconds);
  const [coupon, setCoupon] = useState<CouponState>({ kind: "gate" });
  const [email, setEmail] = useState("");

  async function requestCoupon(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setCoupon({ kind: "error", message: "Bitte gib eine gültige E-Mail-Adresse ein." });
      return;
    }
    setCoupon({ kind: "requesting" });
    try {
      const res = await fetch("/api/lms/quiz-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCoupon({
          kind: "error",
          message:
            data?.error === "invalid_email"
              ? "Bitte gib eine gültige E-Mail-Adresse ein."
              : "Es ist ein Fehler aufgetreten. Bitte versuche es erneut.",
        });
        return;
      }
      setCoupon({
        kind: "revealed",
        code: data.code,
        expiresAt: data.expiresAt,
      });
    } catch {
      setCoupon({
        kind: "error",
        message: "Netzwerkfehler. Bitte versuche es erneut.",
      });
    }
  }

  function formatExpiryDate(iso: string): string {
    return new Date(iso).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  // Per-question timer. Stops as soon as an answer is locked
  // (answers[currentIdx] !== null) so the user can read the
  // correct/incorrect feedback in peace. On timeout without an
  // answer we lock the question as -1 ("no answer") so the
  // auto-advance effect below picks it up like a normal selection.
  useEffect(() => {
    if (stage !== "question") return;
    if (answers[currentIdx] !== null) return;
    if (timeLeft <= 0) {
      setAnswers((prev) => {
        const next = [...prev];
        next[currentIdx] = -1;
        return next;
      });
      return;
    }
    const t = setTimeout(() => setTimeLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [stage, currentIdx, timeLeft, answers]);

  // Auto-advance: once a question is locked (real answer or
  // timeout-marked -1), give the user 1.8s to read the green/red
  // feedback, then move to the next question or to the result
  // stage. No "Weiter" button required.
  useEffect(() => {
    if (stage !== "question") return;
    if (answers[currentIdx] === null) return;
    const t = setTimeout(() => {
      if (currentIdx >= questions.length - 1) {
        setStage("result");
      } else {
        setCurrentIdx((i) => i + 1);
        setTimeLeft(timePerQuestionSeconds);
      }
    }, 1800);
    return () => clearTimeout(t);
  }, [stage, currentIdx, answers, questions.length, timePerQuestionSeconds]);

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

  const score = questions.reduce((acc, q, i) => {
    const ans = answers[i];
    return acc + (ans !== null && q.options[ans]?.correct ? 1 : 0);
  }, 0);
  const passed = score === questions.length;

  if (stage === "intro") {
    return (
      <section className="my-2">
        <p className="text-[1.05rem] leading-[1.65] text-black/85 max-w-xl">
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
      <section className="my-2">
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

        {passed ? (
          coupon.kind === "revealed" ? (
            <div className="mt-6 bg-[#0066FF] rounded-[10px] px-6 py-7 text-center shadow-md">
              <p className="text-xs uppercase tracking-[0.2em] text-white/80 font-semibold">
                Dein {voucherLabel}
              </p>
              <p className="mt-3 font-mono text-3xl md:text-5xl font-extrabold text-white tracking-wider break-all">
                {coupon.code}
              </p>
              <p className="mt-4 text-sm text-white/85 max-w-md mx-auto">
                Gib den Code beim Checkout des Grundkurs Botulinum ein.
                Einmalig nutzbar, gültig bis {formatExpiryDate(coupon.expiresAt)}.
              </p>
            </div>
          ) : (
            <form
              onSubmit={requestCoupon}
              className="mt-6 border border-black/10 rounded-[10px] px-6 py-5"
            >
              <label
                htmlFor="quiz-email"
                className="block text-sm font-semibold text-black"
              >
                Trag Deine E-Mail-Adresse ein, um Deinen {voucherLabel} zu
                erhalten.
              </label>
              <p className="mt-1 text-sm text-black/60">
                Wir generieren einen einmalig nutzbaren Code, gültig 5 Tage.
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40"
                    strokeWidth={2.25}
                    aria-hidden
                  />
                  <input
                    id="quiz-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={coupon.kind === "requesting"}
                    placeholder="dein.name@beispiel.de"
                    className="w-full rounded-[10px] border border-black/15 bg-white pl-9 pr-3 py-2.5 text-sm text-black focus:outline-none focus:border-[#0066FF] disabled:opacity-50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={coupon.kind === "requesting"}
                  className="inline-flex items-center justify-center bg-[#0066FF] hover:bg-[#0055DD] text-white font-bold text-sm px-5 py-2.5 rounded-[10px] transition-colors disabled:opacity-60"
                >
                  {coupon.kind === "requesting"
                    ? "Wird generiert ..."
                    : "Code anzeigen"}
                </button>
              </div>
              {coupon.kind === "error" ? (
                <p className="mt-3 text-sm text-red-600">{coupon.message}</p>
              ) : null}
            </form>
          )
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          {grundkursUrl && coupon.kind === "revealed" ? (
            <a
              href={grundkursUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center bg-[#0066FF] hover:bg-[#0055DD] text-white font-bold text-base px-6 py-3 rounded-[10px] transition-colors"
            >
              Zum Grundkurs Botulinum →
            </a>
          ) : null}
          {!passed ? (
            <button
              type="button"
              onClick={start}
              className="inline-flex items-center bg-white hover:bg-black/5 text-black font-medium text-base px-6 py-3 rounded-[10px] transition-colors"
            >
              Nochmal versuchen
            </button>
          ) : null}
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

    </section>
  );
}
