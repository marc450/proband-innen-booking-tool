"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Result = {
  ok: boolean;
  processed: number;
  inserted: number;
  skippedAlreadyDone: number;
  skippedNoEmail: number;
  failed: number;
  errors?: Array<{ patient_id: string; reason: string }>;
};

export default function MigratePatientEmailsPage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/migrate-patient-emails", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || `HTTP ${res.status}`);
      } else {
        setResult(json);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Patient-E-Mails migrieren</h1>
        <p className="text-sm text-muted-foreground mt-2">
          One-shot Backfill für die neue Tabelle <code>patient_email_hashes</code>.
          Liest jede Patient:innen-E-Mail aus dem verschlüsselten Blob,
          re-verschlüsselt sie als eigene Zeile und markiert sie als primary.
          Idempotent: Patient:innen mit bestehender Zeile werden übersprungen,
          Wiederholung ist sicher.
        </p>
      </div>

      <Button onClick={run} disabled={running}>
        {running ? "Läuft..." : "Backfill starten"}
      </Button>

      {error && (
        <div className="rounded-[10px] bg-red-50 border border-red-200 p-4 text-sm text-red-900">
          <strong>Fehler:</strong> {error}
        </div>
      )}

      {result && (
        <div className="rounded-[10px] bg-emerald-50 border border-emerald-200 p-4 text-sm space-y-2">
          <div className="font-bold text-emerald-900">Backfill abgeschlossen</div>
          <div className="grid grid-cols-2 gap-y-1">
            <span className="text-muted-foreground">Verarbeitet:</span>
            <span className="font-mono">{result.processed}</span>
            <span className="text-muted-foreground">Neu eingefügt:</span>
            <span className="font-mono text-emerald-700">{result.inserted}</span>
            <span className="text-muted-foreground">Schon vorhanden:</span>
            <span className="font-mono">{result.skippedAlreadyDone}</span>
            <span className="text-muted-foreground">Ohne E-Mail:</span>
            <span className="font-mono">{result.skippedNoEmail}</span>
            <span className="text-muted-foreground">Fehlgeschlagen:</span>
            <span className={`font-mono ${result.failed > 0 ? "text-red-700" : ""}`}>
              {result.failed}
            </span>
          </div>
          {result.errors && result.errors.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-red-700">
                Fehler-Details ({result.errors.length})
              </summary>
              <ul className="mt-2 space-y-1 text-xs font-mono">
                {result.errors.map((e, i) => (
                  <li key={i}>
                    {e.patient_id}: {e.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
