"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";

interface Props {
  token: string;
  /**
   * Preview mode shows the form exactly as a doctor sees it but
   * short-circuits the submit so no review is written to the DB. Used
   * by /bewertung/preview so staff can show stakeholders the form
   * without minting a token or polluting course_reviews.
   */
  previewMode?: boolean;
}

const PRIMARY = "#0066FF";

export function ReviewForm({ token, previewMode = false }: Props) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  // Intentionally not prefilled from the booking record. Marc's preference:
  // the doctor types their own display name, signalling intent to publish.
  const [firstName, setFirstName] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [internalFeedback, setInternalFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 5-Sterne-Celebration: kurzes Wave-Bounce der Sterne plus
  // Konfetti aus kleinen Sternchen, die nach oben wegdriften.
  // ~1.5s Dauer, dann automatisch wieder aus, damit der Doctor
  // weiterscrollen kann ohne von Animation abgelenkt zu werden.
  const [celebrating, setCelebrating] = useState(false);
  useEffect(() => {
    if (rating !== 5) return;
    setCelebrating(true);
    const t = setTimeout(() => setCelebrating(false), 1500);
    return () => clearTimeout(t);
  }, [rating]);

  const canSubmit =
    rating >= 1 &&
    rating <= 5 &&
    firstName.trim().length > 0 &&
    !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    if (previewMode) {
      // Simulate the success state without hitting the API. Tiny delay
      // so the button "Wird gesendet..." flicker matches reality.
      setTimeout(() => {
        setDone(true);
        setSubmitting(false);
      }, 250);
      return;
    }
    try {
      const res = await fetch("/api/submit-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          rating,
          firstName: firstName.trim(),
          bodyText: bodyText.trim(),
          internalFeedback: internalFeedback.trim(),
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Da ist etwas schiefgelaufen.");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Da ist etwas schiefgelaufen.");
    } finally {
      if (!previewMode) setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="bg-white rounded-[10px] shadow-sm p-8 text-left">
        <h1 className="text-2xl font-bold mb-3">Vielen Dank, {firstName}!</h1>
        <p className="text-base leading-relaxed text-gray-700">
          Deine Bewertung ist bei uns angekommen. Wir lesen jede einzelne
          Antwort und freuen uns über jeden Hinweis, der uns besser macht.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-[10px] shadow-sm p-6 sm:p-8 space-y-6"
    >
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
          Wie war Dein Kurs?
        </h1>
        <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
          Wir wären Dir wahnsinnig dankbar für eine kurze Bewertung. Und
          falls es etwas gibt, das wir besser machen können, sag es uns
          bitte ehrlich. Dein Feedback hilft uns, EPHIA für alle
          Ärzt:innen, die nach Dir kommen, ein Stück besser zu machen.
        </p>
      </header>

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-900">
          Sterne
        </label>
        <div className="relative inline-block">
          <div
            className="flex items-center gap-1"
            onMouseLeave={() => setHoverRating(0)}
          >
            {[1, 2, 3, 4, 5].map((value, idx) => {
              const active = (hoverRating || rating) >= value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-label={`${value} Stern${value === 1 ? "" : "e"}`}
                  aria-pressed={rating === value}
                  onMouseEnter={() => setHoverRating(value)}
                  onClick={() => setRating(value)}
                  className={`p-1 rounded transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2${
                    celebrating ? " bewertung-star-wave" : ""
                  }`}
                  style={{
                    color: active ? PRIMARY : "#D1D5DB",
                    animationDelay: celebrating ? `${idx * 80}ms` : undefined,
                  }}
                >
                  <Star
                    className="h-9 w-9"
                    fill={active ? PRIMARY : "none"}
                    strokeWidth={1.5}
                  />
                </button>
              );
            })}
          </div>
          {celebrating && (
            <div
              className="pointer-events-none absolute inset-0 -top-3 overflow-visible"
              aria-hidden="true"
            >
              {Array.from({ length: 10 }).map((_, i) => {
                // Brand-Palette aus dem Brand Manual: Signal Blau, plus
                // Brown 1/2/3. Bewusst kein Rot/Grün, keine Hochzeits-
                // Look. Cute aber EPHIA-on-brand.
                const colors = ["#0066FF", "#BF785E", "#D9AA8F", "#733D29"];
                const color = colors[i % colors.length];
                // Konfetti driften zufällig links/rechts und unter-
                // schiedlich weit nach oben weg.
                const tx = (i % 2 === 0 ? -1 : 1) * (10 + ((i * 13) % 60));
                const ty = -(40 + ((i * 19) % 30));
                return (
                  <Star
                    key={i}
                    className="bewertung-confetti-star absolute h-3.5 w-3.5"
                    style={
                      {
                        left: `${5 + i * 9.5}%`,
                        top: 0,
                        color,
                        fill: color,
                        animationDelay: `${i * 40}ms`,
                        ["--tx"]: `${tx}px`,
                        ["--ty"]: `${ty}px`,
                      } as React.CSSProperties & { "--tx": string; "--ty": string }
                    }
                  />
                );
              })}
            </div>
          )}
          <style>{`
            @keyframes bewertung-star-wave {
              0%, 100% { transform: scale(1) rotate(0deg); }
              40% { transform: scale(1.25) rotate(-8deg); }
              70% { transform: scale(1.1) rotate(6deg); }
            }
            .bewertung-star-wave {
              animation: bewertung-star-wave 700ms ease-in-out;
            }
            @keyframes bewertung-confetti-star {
              0% { transform: translate(0, 0) rotate(0deg) scale(0.4); opacity: 0; }
              15% { opacity: 1; }
              100% { transform: translate(var(--tx, 0), var(--ty, -50px)) rotate(180deg) scale(1.1); opacity: 0; }
            }
            .bewertung-confetti-star {
              animation: bewertung-confetti-star 1.2s ease-out forwards;
            }
          `}</style>
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="bewertung-firstname"
          className="block text-sm font-semibold text-gray-900"
        >
          Dein Vorname
        </label>
        <p className="text-xs text-gray-600">
          Erscheint öffentlich neben Deiner Bewertung. Nachname und E-Mail
          bleiben bei uns.
        </p>
        <input
          id="bewertung-firstname"
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          placeholder="z.B. Anna"
          className="w-full rounded-[10px] bg-[#E0E5E9] px-4 py-3 text-base placeholder:text-gray-500 focus:outline-none focus-visible:ring-2"
          style={{ caretColor: PRIMARY }}
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="bewertung-body"
          className="block text-sm font-semibold text-gray-900"
        >
          Was möchtest Du anderen Ärzt:innen über diesen Kurs sagen?
        </label>
        <p className="text-xs text-gray-600">
          Optional. Wird auf unserer Kursseite gezeigt neben Deiner
          Sternebewertung.
        </p>
        <textarea
          id="bewertung-body"
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="Was hat Dir geholfen? Was nimmst Du mit in Deinen Klinikalltag?"
          className="w-full rounded-[10px] bg-[#E0E5E9] px-4 py-3 text-base placeholder:text-gray-500 focus:outline-none focus-visible:ring-2"
          style={{ caretColor: PRIMARY }}
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="bewertung-internal"
          className="block text-sm font-semibold text-gray-900"
        >
          Anonymes Feedback an unsere Gründer:innen Sophia & Marc
        </label>
        <p className="text-xs text-gray-600">
          Wird niemals veröffentlicht und nicht mit Deinem Namen verknüpft.
        </p>
        <textarea
          id="bewertung-internal"
          value={internalFeedback}
          onChange={(e) => setInternalFeedback(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Was sollten wir besser machen? Was hat gefehlt? Diese Antwort sieht ausschließlich unser internes Team."
          className="w-full rounded-[10px] bg-[#E0E5E9] px-4 py-3 text-base placeholder:text-gray-500 focus:outline-none focus-visible:ring-2"
          style={{ caretColor: PRIMARY }}
        />
      </div>

      {error && (
        <div className="rounded-[10px] bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full sm:w-auto inline-flex items-center justify-center text-white font-bold rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        style={{
          backgroundColor: PRIMARY,
          fontSize: "1.6rem",
          letterSpacing: 0,
          textTransform: "none",
          padding: "15px 25px",
        }}
      >
        {submitting ? "Wird gesendet..." : "Bewertung absenden"}
      </button>
    </form>
  );
}
