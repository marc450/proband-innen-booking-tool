"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface Props {
  token: string;
  defaultFirstName: string;
  /**
   * Preview mode shows the form exactly as a doctor sees it but
   * short-circuits the submit so no review is written to the DB. Used
   * by /bewertung/preview so staff can show stakeholders the form
   * without minting a token or polluting course_reviews.
   */
  previewMode?: boolean;
}

const PRIMARY = "#0066FF";

export function ReviewForm({
  token,
  defaultFirstName,
  previewMode = false,
}: Props) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [firstName, setFirstName] = useState(defaultFirstName);
  const [bodyText, setBodyText] = useState("");
  const [internalFeedback, setInternalFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          Eine Minute reicht. Deine Sterne und Dein Bewertungstext
          erscheinen später mit Deinem Vornamen auf unserer Kursseite. Das
          Team-Feedback bleibt anonym.
        </p>
      </header>

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-900">
          Sterne
        </label>
        <div
          className="flex items-center gap-1"
          onMouseLeave={() => setHoverRating(0)}
        >
          {[1, 2, 3, 4, 5].map((value) => {
            const active = (hoverRating || rating) >= value;
            return (
              <button
                key={value}
                type="button"
                aria-label={`${value} Stern${value === 1 ? "" : "e"}`}
                aria-pressed={rating === value}
                onMouseEnter={() => setHoverRating(value)}
                onClick={() => setRating(value)}
                className="p-1 rounded transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2"
                style={{ color: active ? PRIMARY : "#D1D5DB" }}
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
      </div>

      <div className="space-y-2">
        <label
          htmlFor="bewertung-firstname"
          className="block text-sm font-semibold text-gray-900"
        >
          Dein Vorname
        </label>
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
        <p className="text-xs text-gray-600">
          Erscheint öffentlich neben Deiner Bewertung. Nachname und E-Mail
          bleiben bei uns.
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="bewertung-body"
          className="block text-sm font-semibold text-gray-900"
        >
          Was möchtest Du anderen Ärzt:innen über diesen Kurs sagen?
        </label>
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
        <p className="text-xs text-gray-600">
          Optional. Wird auf unserer Kursseite gezeigt, sobald wir sie
          freischalten.
        </p>
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
