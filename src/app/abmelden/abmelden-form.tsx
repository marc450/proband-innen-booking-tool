"use client";

import { useState } from "react";

interface Props {
  contactId: string;
  firstName: string | null;
  initialOptedOut: boolean;
}

type State = "idle" | "submitting" | "done" | "resubscribing" | "resubscribed" | "error";

export function AbmeldenForm({ contactId, firstName, initialOptedOut }: Props) {
  const [state, setState] = useState<State>(initialOptedOut ? "done" : "idle");
  const [error, setError] = useState<string | null>(null);

  const greeting = firstName ? `Hi ${firstName}!` : "Hi!";

  const handleOptOut = async () => {
    setState("submitting");
    setError(null);
    try {
      const res = await fetch(
        `/api/unsubscribe?id=${encodeURIComponent(contactId)}`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      setState("error");
    }
  };

  const handleResubscribe = async () => {
    setState("resubscribing");
    setError(null);
    try {
      const res = await fetch(
        `/api/resubscribe?id=${encodeURIComponent(contactId)}`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState("resubscribed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      setState("error");
    }
  };

  if (state === "resubscribed") {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-3">Willkommen zurück!</h1>
        <p className="text-sm text-black/70">
          Du erhältst wieder unsere E-Mail-Mitteilungen.
        </p>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-3">Du bist abgemeldet</h1>
        <p className="text-sm text-black/70 mb-2">
          Du erhältst keine weiteren E-Mail-Kampagnen von uns.
        </p>
        <p className="text-sm text-black/70 mb-6">
          Bestätigungen zu Deinen konkreten Buchungen und Terminänderungen
          erhältst Du weiterhin.
        </p>
        <button
          onClick={handleResubscribe}
          disabled={state !== "done"}
          className="text-sm text-[#0066FF] underline disabled:opacity-50"
        >
          Versehentlich abgemeldet? Hier reaktivieren
        </button>
      </div>
    );
  }

  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold mb-3">{greeting}</h1>
      <p className="text-sm text-black/70 mb-2">
        Möchtest Du Dich von unseren E-Mail-Kampagnen abmelden?
      </p>
      <p className="text-sm text-black/70 mb-8">
        Du bleibst per E-Mail erreichbar für Deine konkreten Buchungen
        und Terminänderungen.
      </p>

      <button
        onClick={handleOptOut}
        disabled={state === "submitting"}
        className="bg-[#0066FF] text-white font-bold text-base px-6 py-3 rounded-[10px] disabled:opacity-60 hover:bg-[#0055DD] transition-colors"
      >
        {state === "submitting" ? "Wird abgemeldet..." : "Ja, abmelden"}
      </button>

      {error && (
        <p className="mt-4 text-sm text-red-600">
          Hat nicht geklappt: {error}. Bitte versuche es nochmal oder
          schreib uns unter{" "}
          <a
            href="mailto:customerlove@ephia.de"
            className="underline"
          >
            customerlove@ephia.de
          </a>
          .
        </p>
      )}
    </div>
  );
}
