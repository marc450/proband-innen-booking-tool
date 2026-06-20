"use client";

import { useState } from "react";

// Public one-click withdrawal of the Galderma data-forwarding consent.
// The token in the URL authorizes the action (it came from the
// confirmation email). We do NOT auto-revoke on load (a link prefetch or
// mail scanner must not trigger it); the participant confirms with a click.

type Status = "idle" | "submitting" | "done" | "error";

export function WithdrawClient({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/partner-consent/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Der Widerruf konnte nicht verarbeitet werden.");
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setError("Netzwerkfehler. Bitte versuche es später erneut.");
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <div className="rounded-[10px] bg-white shadow-sm p-6 md:p-8">
        <h2 className="text-xl font-bold mb-3 text-[#111111]">Widerruf bestätigt</h2>
        <p className="text-base leading-relaxed text-black/80">
          Deine Einwilligung zur Datenweitergabe an die Galderma Laboratorium
          GmbH ist widerrufen. Wir geben Deine Daten nicht weiter und haben
          Galderma, sofern bereits eine Übermittlung erfolgt war, zur Löschung
          aufgefordert. Der Widerruf wirkt sich nicht auf die Rechtmäßigkeit der
          bis dahin erfolgten Verarbeitung aus.
        </p>
        <p className="text-base leading-relaxed text-black/80 mt-4">
          Bei Fragen erreichst Du uns unter{" "}
          <a href="mailto:customerlove@ephia.de" className="text-[#0066FF] underline">
            customerlove@ephia.de
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[10px] bg-white shadow-sm p-6 md:p-8">
      <p className="text-base leading-relaxed text-black/80 mb-6">
        Mit einem Klick auf den Button widerrufst Du Deine Einwilligung, dass
        EPHIA Deine Kontaktdaten an die Galderma Laboratorium GmbH weitergibt.
        Wir nehmen Dich umgehend aus der Liste und informieren Galderma, falls
        Deine Daten bereits übermittelt wurden.
      </p>

      {status === "error" && error && (
        <p className="text-sm text-red-600 mb-4">{error}</p>
      )}

      <button
        type="button"
        onClick={confirm}
        disabled={status === "submitting"}
        className="inline-block bg-[#0066FF] text-white font-bold rounded-[10px] px-6 py-3 disabled:opacity-60"
      >
        {status === "submitting" ? "Wird widerrufen…" : "Einwilligung widerrufen"}
      </button>
    </div>
  );
}
