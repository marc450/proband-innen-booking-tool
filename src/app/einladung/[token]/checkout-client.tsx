"use client";

import { useState } from "react";

interface Props {
  token: string;
  // Single-course invite fields. Ignored when `multi` is true.
  courseKey?: string;
  courseType?: string;
  sessionId?: string | null;
  // Multi-course invite: pay for every attached course in one checkout.
  multi?: boolean;
  label?: string;
}

export function EinladungCheckout({
  token,
  courseKey,
  courseType,
  sessionId,
  multi = false,
  label,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const endpoint = multi ? "/api/einladung-checkout" : "/api/course-checkout";
      const body = multi
        ? { inviteToken: token }
        : {
            courseKey,
            courseType,
            sessionId: sessionId || undefined,
            inviteToken: token,
          };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Checkout konnte nicht gestartet werden.");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unerwarteter Fehler.");
      setLoading(false);
    }
  }

  const disabled = loading || (!multi && (!courseKey || !courseType));

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="w-full bg-[#0066FF] text-white font-bold rounded-[10px] py-4 px-6 text-base hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition"
      >
        {loading ? "Einen Moment …" : label || "Einladung einlösen"}
      </button>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
