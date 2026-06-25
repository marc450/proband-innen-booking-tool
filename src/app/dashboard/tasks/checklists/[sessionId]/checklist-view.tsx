"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ArrowLeft, CheckCircle2, GraduationCap } from "lucide-react";

import { Card } from "@/components/ui/card";
import { AlertDialog } from "@/components/confirm-dialog";
import {
  COURSE_CHECKLIST,
  CHECKLIST_TOTAL,
} from "@/lib/course-checklist";

export interface ChecklistItemState {
  checked: boolean;
  checked_at: string | null;
  checked_by_name: string | null;
}

interface Props {
  sessionId: string;
  courseTitle: string;
  dateIso: string;
  instructorName: string | null;
  betreuerName: string | null;
  address: string | null;
  initialState: Record<string, ChecklistItemState>;
  currentUserName: string;
}

export function ChecklistView({
  sessionId,
  courseTitle,
  dateIso,
  instructorName,
  betreuerName,
  address,
  initialState,
  currentUserName,
}: Props) {
  const [state, setState] =
    useState<Record<string, ChecklistItemState>>(initialState);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [alert, setAlert] = useState<string | null>(null);

  const doneCount = useMemo(
    () => Object.values(state).filter((s) => s.checked).length,
    [state],
  );
  const complete = doneCount >= CHECKLIST_TOTAL;
  const pct = Math.round((doneCount / CHECKLIST_TOTAL) * 100);

  const toggle = async (key: string, next: boolean) => {
    if (pending.has(key)) return;
    setPending((p) => new Set(p).add(key));

    // Optimistic update.
    const prev = state[key];
    setState((s) => ({
      ...s,
      [key]: next
        ? {
            checked: true,
            checked_at: new Date().toISOString(),
            checked_by_name: currentUserName,
          }
        : { checked: false, checked_at: null, checked_by_name: null },
    }));

    const res = await fetch(`/api/admin/course-checklists/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_key: key, checked: next }),
    });

    setPending((p) => {
      const copy = new Set(p);
      copy.delete(key);
      return copy;
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      // Roll back.
      setState((s) => ({
        ...s,
        [key]: prev ?? {
          checked: false,
          checked_at: null,
          checked_by_name: null,
        },
      }));
      setAlert(data?.error || "Speichern fehlgeschlagen.");
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <AlertDialog
        open={!!alert}
        title="Fehler"
        description={alert ?? ""}
        onClose={() => setAlert(null)}
      />

      <Link
        href="/dashboard/tasks/checklists"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu den Checklisten
      </Link>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <GraduationCap className="h-6 w-6 text-[#0066FF] shrink-0 mt-0.5" />
          <div>
            <h1 className="text-2xl font-bold leading-tight">{courseTitle}</h1>
            <p className="text-sm text-muted-foreground">
              {dateIso
                ? format(new Date(dateIso), "EEEE, dd.MM.yyyy", { locale: de })
                : ""}
              {instructorName ? ` · ${instructorName}` : ""}
              {betreuerName ? ` · Kursbetreuung: ${betreuerName}` : ""}
              {address ? ` · ${address}` : ""}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {doneCount} von {CHECKLIST_TOTAL} erledigt
            </span>
            <span className="text-muted-foreground">{pct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-black/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${complete ? "bg-emerald-500" : "bg-[#0066FF]"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {complete && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-emerald-800">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">
              Alle Aufgaben erledigt. Der Kurs kann abgeschlossen werden.
            </span>
          </div>
        )}
      </div>

      {/* Phases */}
      <div className="space-y-4">
        {COURSE_CHECKLIST.map((phase) => (
          <Card key={phase.phase} className="p-5">
            <h2 className="text-base font-semibold mb-3">{phase.phase}</h2>
            <div className="space-y-1">
              {phase.items.map((item) => {
                const s = state[item.key];
                const checked = !!s?.checked;
                const busy = pending.has(item.key);
                return (
                  <label
                    key={item.key}
                    className={`flex items-start gap-3 rounded-md px-2 py-2 -mx-2 cursor-pointer hover:bg-black/[0.03] ${busy ? "opacity-60" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={busy}
                      onChange={(e) => toggle(item.key, e.target.checked)}
                      className="mt-0.5 h-5 w-5 rounded accent-[#0066FF] shrink-0 cursor-pointer"
                    />
                    <span className="flex flex-col gap-0.5">
                      <span
                        className={`text-sm leading-snug ${checked ? "text-muted-foreground line-through" : ""}`}
                      >
                        {item.label}
                      </span>
                      {checked && s?.checked_by_name && (
                        <span className="text-xs text-muted-foreground">
                          Abgehakt von {s.checked_by_name}
                          {s.checked_at
                            ? `, ${format(new Date(s.checked_at), "dd.MM.yyyy HH:mm", { locale: de })} Uhr`
                            : ""}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
