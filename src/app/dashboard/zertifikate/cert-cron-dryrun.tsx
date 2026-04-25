"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface DryRunRow {
  bookingId: string;
  sessionId: string;
  sessionDateIso: string;
  email: string | null;
  fullName: string;
  courseType: string;
  audienceTag: string | null;
  specialty: string | null;
  status: string | null;
  certSentAt: string | null;
  decision:
    | { kind: "send"; certSlug: string; certLabel: string; reason: string }
    | { kind: "skip"; reason: string };
}

/**
 * Dry-run preview of the post-praxis certificate cron. Lets the admin
 * pick a session date and see, per booking, which certificate would
 * be sent (and why) or which skip branch would fire — without ever
 * sending an email or writing cert_sent_at.
 */
export function CertCronDryRun({ defaultDate }: { defaultDate: string }) {
  const [date, setDate] = useState(defaultDate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<DryRunRow[] | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    setRows(null);
    try {
      const res = await fetch(
        `/api/cert-cron-dryrun?date=${encodeURIComponent(date)}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
      } else {
        setRows(data.rows || []);
      }
    } catch {
      setError("Verbindungsfehler");
    } finally {
      setLoading(false);
    }
  };

  const sendCount = rows?.filter((r) => r.decision.kind === "send").length ?? 0;
  const skipCount = rows?.filter((r) => r.decision.kind === "skip").length ?? 0;

  return (
    <div className="space-y-4 bg-white rounded-[10px] p-6 shadow-sm ring-1 ring-black/5">
      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="dryrun_date">Kurstermin (date_iso)</Label>
          <Input
            id="dryrun_date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <Button
          type="button"
          onClick={run}
          disabled={loading || !date}
          className="bg-[#0066FF] hover:bg-[#0055DD] text-white"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              Lädt...
            </>
          ) : (
            "Dry-Run ausführen"
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Listet alle Buchungen auf Sessions mit dem gewählten Termin und zeigt,
        welches Zertifikat der Cron senden würde, oder warum er die Buchung
        überspringt. Es werden keine E-Mails verschickt und kein cert_sent_at
        geschrieben.
      </p>

      {error && (
        <p className="text-sm text-destructive bg-red-50 rounded-[10px] px-3 py-2">
          {error}
        </p>
      )}

      {rows && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Keine Buchungen für diesen Termin gefunden.
        </p>
      )}

      {rows && rows.length > 0 && (
        <>
          <div className="flex items-center gap-3 text-xs">
            <span className="bg-emerald-100 text-emerald-700 rounded-full px-2.5 py-0.5 font-medium">
              {sendCount} würden Zertifikat erhalten
            </span>
            <span className="bg-gray-100 text-gray-700 rounded-full px-2.5 py-0.5 font-medium">
              {skipCount} übersprungen
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 pr-3 font-medium">Kurstyp</th>
                  <th className="py-2 pr-3 font-medium">Audience / Specialty</th>
                  <th className="py-2 pr-3 font-medium">Entscheidung</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.bookingId} className="border-b border-gray-100 align-top">
                    <td className="py-2 pr-3">
                      <div className="font-medium">{r.fullName}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.email || "(keine E-Mail)"}
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-xs">
                      <div>{r.courseType}</div>
                      <div className="text-muted-foreground">
                        status: {r.status || "–"}
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-xs">
                      <div>{r.audienceTag || "–"}</div>
                      <div className="text-muted-foreground">
                        {r.specialty || "(specialty leer)"}
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-xs">
                      {r.decision.kind === "send" ? (
                        <div>
                          <span className="inline-block bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 font-medium">
                            {r.decision.certLabel}
                          </span>
                          <div className="text-muted-foreground mt-0.5">
                            {r.decision.reason}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="inline-block bg-gray-100 text-gray-700 rounded-full px-2 py-0.5 font-medium">
                            Skip
                          </span>
                          <div className="text-muted-foreground mt-0.5">
                            {r.decision.reason}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
