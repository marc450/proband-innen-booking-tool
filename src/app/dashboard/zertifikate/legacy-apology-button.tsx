"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, ConfirmDialog } from "@/components/confirm-dialog";
import { Loader2, MailWarning } from "lucide-react";

/**
 * One-click trigger for /api/send-legacy-apology. Shows a confirmation
 * dialog (the action sends real emails) and then a result dialog with
 * the number of emails dispatched. The route is idempotent — re-clicking
 * after success is a no-op because the legacy_apology_sent_at stamp
 * filters everyone out.
 */
export function LegacyApologyButton() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    title: string;
    description: string;
  } | null>(null);

  const fire = async () => {
    setSending(true);
    setConfirmOpen(false);
    try {
      const res = await fetch("/api/send-legacy-apology", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({
          title: "Fehler",
          description: data.error || `HTTP ${res.status}`,
        });
        return;
      }
      const sent = data.sent ?? 0;
      const errors = data.errors ?? 0;
      setResult({
        title: errors > 0 ? "Teilweise versendet" : "Versendet",
        description:
          errors > 0
            ? `${sent} E-Mails verschickt, ${errors} fehlgeschlagen. Erneut klicken, um die Nachzügler zu wiederholen (idempotent).`
            : `${sent} E-Mails verschickt.`,
      });
    } catch {
      setResult({ title: "Fehler", description: "Verbindungsfehler" });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="bg-amber-50 border border-amber-200 rounded-[10px] p-5">
        <div className="flex items-start gap-3 mb-3">
          <MailWarning className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm text-amber-900">
              Legacy Apology (einmalig)
            </h3>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              Sendet die Korrektur der versehentlichen
              &quot;Profil vervollständigen&quot;-E-Mail an alle 64 Legacy-Buchungen,
              die am 26.04.2026 betroffen waren. Idempotent: bereits
              benachrichtigte Empfänger:innen werden übersprungen.
            </p>
          </div>
        </div>
        <Button
          onClick={() => setConfirmOpen(true)}
          disabled={sending}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          {sending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              Versende...
            </>
          ) : (
            "Legacy Apology versenden"
          )}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Legacy Apology versenden?"
        description="Sendet eine Entschuldigungs-E-Mail mit Profil-Link an alle Legacy-Buchungen, die am 26.04.2026 die falsche Reminder-Mail erhalten haben. Bereits benachrichtigte Empfänger:innen werden übersprungen."
        confirmLabel="Jetzt versenden"
        variant="destructive"
        onConfirm={fire}
        onCancel={() => setConfirmOpen(false)}
      />

      <AlertDialog
        open={!!result}
        title={result?.title ?? ""}
        description={result?.description ?? ""}
        onClose={() => setResult(null)}
      />
    </>
  );
}
