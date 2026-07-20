"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Users, MapPin, Clock, Check } from "lucide-react";
import { parseDateOnly } from "@/lib/date";

export interface OpenProposal {
  id: string;
  templateName: string;
  proposedDate: string;
  startTime: string | null;
  durationMinutes: number | null;
  address: string | null;
  notes: string | null;
  applicantCount: number;
  applied: boolean;
  /** The note the current Dozent:in left on their own application, if any. */
  myNote: string | null;
}

const MONTHS_DE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];
const WEEKDAYS_DE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

function formatLongDate(iso: string): string {
  const d = parseDateOnly(iso);
  return `${WEEKDAYS_DE[d.getDay()]}, ${d.getDate()}. ${MONTHS_DE[d.getMonth()]} ${d.getFullYear()}`;
}

export function OffeneTermineView({
  initialProposals,
}: {
  initialProposals: OpenProposal[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Per-card note drafts, seeded from whatever note the Dozent:in already
  // left. Kept across router.refresh() since the component isn't remounted.
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      initialProposals.map((p) => [p.id, p.myNote ?? ""]),
    ),
  );

  const setNote = (id: string, value: string) =>
    setNoteDrafts((prev) => ({ ...prev, [id]: value }));

  // action "apply" also carries the note (add or edit); "withdraw" removes
  // the whole application. The API upserts, so re-applying just updates it.
  const submit = async (p: OpenProposal, action: "apply" | "withdraw") => {
    setBusyId(p.id);
    setError(null);
    try {
      const res = await fetch("/api/kursplanung/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: p.id,
          action,
          note: action === "apply" ? noteDrafts[p.id]?.trim() || null : null,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error || `Aktion fehlgeschlagen (HTTP ${res.status})`);
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  if (initialProposals.length === 0) {
    return (
      <div className="rounded-lg bg-white p-8 text-center text-sm text-muted-foreground">
        Aktuell sind keine offenen Termine ausgeschrieben.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 flex items-start justify-between gap-4">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 font-medium shrink-0"
          >
            Schließen
          </button>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {initialProposals.map((p) => (
          <div
            key={p.id}
            className="rounded-lg bg-white p-5 flex flex-col gap-3"
          >
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-[#0055DD]">
                {p.templateName}
              </div>
              <div className="text-lg font-bold mt-0.5">
                {formatLongDate(p.proposedDate)}
              </div>
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" />
                {p.startTime || "—"}
                {p.durationMinutes ? ` · ${p.durationMinutes} Min` : ""}
              </div>
              {p.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate">{p.address}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 shrink-0" />
                {p.applicantCount}{" "}
                {p.applicantCount === 1 ? "Bewerbung" : "Bewerbungen"}
              </div>
            </div>

            {p.notes && (
              <p className="text-sm text-muted-foreground bg-gray-50 rounded-md px-3 py-2">
                {p.notes}
              </p>
            )}

            <div className="mt-auto pt-1 space-y-2">
              <Textarea
                value={noteDrafts[p.id] ?? ""}
                onChange={(e) => setNote(p.id, e.target.value)}
                placeholder="Notiz an das EPHIA-Team (optional)"
                rows={2}
                className="text-sm"
              />
              {p.applied ? (
                (() => {
                  const noteChanged =
                    (noteDrafts[p.id]?.trim() || "") !== (p.myNote ?? "");
                  return (
                    <div className="flex gap-2">
                      {noteChanged ? (
                        <Button
                          className="flex-1"
                          disabled={busyId === p.id}
                          onClick={() => submit(p, "apply")}
                        >
                          {busyId === p.id ? "..." : "Notiz speichern"}
                        </Button>
                      ) : (
                        <div className="flex-1 flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                          <Check className="h-4 w-4" />
                          Beworben
                        </div>
                      )}
                      <Button
                        variant="outline"
                        disabled={busyId === p.id}
                        onClick={() => submit(p, "withdraw")}
                      >
                        {busyId === p.id ? "..." : "Zurückziehen"}
                      </Button>
                    </div>
                  );
                })()
              ) : (
                <Button
                  className="w-full"
                  disabled={busyId === p.id}
                  onClick={() => submit(p, "apply")}
                >
                  {busyId === p.id ? "..." : "Auf diesen Termin bewerben"}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
