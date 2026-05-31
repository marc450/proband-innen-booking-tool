"use client";

import { useMemo, useState } from "react";
import { Star, Trash2, Eye, EyeOff, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";

export interface ProbandReviewRow {
  id: string;
  rating: number;
  first_name: string;
  body_text: string | null;
  is_published: boolean;
  submitted_at: string;
  published_at: string | null;
  patient_id: string;
}

type Filter = "all" | "pending" | "published";

interface Props {
  initialReviews: ProbandReviewRow[];
}

function formatDate(iso: string | null): string {
  if (!iso) return "–";
  try {
    return new Date(iso).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((v) => (
        <Star
          key={v}
          className="h-4 w-4"
          fill={v <= rating ? "#0066FF" : "none"}
          stroke={v <= rating ? "#0066FF" : "#D1D5DB"}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

export function ProbandReviewsManager({ initialReviews }: Props) {
  const [reviews, setReviews] = useState<ProbandReviewRow[]>(initialReviews);
  const [filter, setFilter] = useState<Filter>("all");
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // One-time bulk pass to past Proband:innen.
  const [confirmSend, setConfirmSend] = useState(false);
  const [sendCount, setSendCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  const counts = useMemo(() => {
    const pending = reviews.filter((r) => !r.is_published).length;
    const published = reviews.filter((r) => r.is_published).length;
    return { pending, published, all: reviews.length };
  }, [reviews]);

  const visible = useMemo(() => {
    if (filter === "pending") return reviews.filter((r) => !r.is_published);
    if (filter === "published") return reviews.filter((r) => r.is_published);
    return reviews;
  }, [reviews, filter]);

  function setBusy(id: string, on: boolean) {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function togglePublished(id: string, current: boolean) {
    setBusy(id, true);
    try {
      const res = await fetch(`/api/admin/proband-reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: !current }),
      });
      if (!res.ok) throw new Error("Speichern fehlgeschlagen");
      setReviews((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                is_published: !current,
                published_at:
                  !current && !r.published_at
                    ? new Date().toISOString()
                    : r.published_at,
              }
            : r,
        ),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(id, false);
    }
  }

  async function deleteReview(id: string) {
    setBusy(id, true);
    try {
      const res = await fetch(`/api/admin/proband-reviews/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Löschen fehlgeschlagen");
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(id, false);
      setConfirmDeleteId(null);
    }
  }

  async function openSendDialog() {
    setSendResult(null);
    setSendCount(null);
    setLoadingCount(true);
    setConfirmSend(true);
    try {
      const res = await fetch("/api/admin/send-past-proband-review-requests");
      if (!res.ok) throw new Error("Anzahl konnte nicht ermittelt werden.");
      const data = await res.json();
      setSendCount(typeof data.count === "number" ? data.count : 0);
    } catch {
      setSendCount(null);
    } finally {
      setLoadingCount(false);
    }
  }

  async function sendPast() {
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/admin/send-past-proband-review-requests", {
        method: "POST",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Versand fehlgeschlagen.");
      }
      const data = await res.json();
      const r = data?.result ?? {};
      const samplesSuffix =
        (r.errors ?? 0) > 0 && (r.errorSamples?.length ?? 0) > 0
          ? ` Beispielfehler: ${r.errorSamples
              .map((s: string) => `"${s}"`)
              .join("; ")}.`
          : "";
      setSendResult(
        `Fertig. ${r.scheduled ?? 0} Mail(s) verschickt${
          r.skipped ? `, ${r.skipped} übersprungen` : ""
        }${r.errors ? `, ${r.errors} Fehler` : ""}.${samplesSuffix}`,
      );
    } catch (err) {
      setSendResult(
        err instanceof Error ? err.message : "Da ist etwas schiefgelaufen.",
      );
    } finally {
      setSending(false);
      setConfirmSend(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Bewertungen Proband:innen</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bewertungen von Proband:innen aus den Bewertungs-Mails. Sie werden
            aktuell nur gesammelt und nirgends öffentlich angezeigt.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            disabled={sending}
            onClick={openSendDialog}
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {sending ? "Versendet..." : "Vergangene anschreiben"}
          </Button>
        </div>
      </div>
      {sendResult && (
        <div className="rounded-[10px] bg-white px-4 py-3 text-sm shadow-sm">
          {sendResult}
        </div>
      )}

      <div className="flex items-center gap-2">
        {(["all", "pending", "published"] as Filter[]).map((f) => {
          const label =
            f === "all"
              ? `Alle (${counts.all})`
              : f === "pending"
                ? `Wartend (${counts.pending})`
                : `Freigeschaltet (${counts.published})`;
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-sm px-3 py-1.5 rounded-[10px] transition-colors ${
                active
                  ? "bg-[#0066FF] text-white font-semibold"
                  : "bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="bg-white rounded-[10px] p-10 text-center text-sm text-muted-foreground shadow-sm">
          Keine Bewertungen in dieser Ansicht.
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => {
            const isBusy = busyIds.has(r.id);
            return (
              <div
                key={r.id}
                className="bg-white rounded-[10px] shadow-sm p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <StarRow rating={r.rating} />
                      <span className="text-sm font-semibold text-gray-900">
                        {r.first_name}
                      </span>
                      {r.is_published ? (
                        <Badge className="bg-[#0066FF]/10 text-[#0066FF] hover:bg-[#0066FF]/10 text-[10px]">
                          Freigeschaltet
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Wartend
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Eingegangen am {formatDate(r.submitted_at)}
                      {r.published_at && (
                        <> · Freigeschaltet am {formatDate(r.published_at)}</>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant={r.is_published ? "outline" : "default"}
                      disabled={isBusy}
                      onClick={() => togglePublished(r.id, r.is_published)}
                    >
                      {r.is_published ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5 mr-1.5" />
                          Verbergen
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5 mr-1.5" />
                          Freischalten
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isBusy}
                      onClick={() => setConfirmDeleteId(r.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {r.body_text ? (
                  <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
                    {r.body_text}
                  </p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">
                    Kein Bewertungstext.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Bewertung löschen"
        description="Diese Bewertung wird endgültig gelöscht. Diese Aktion kann nicht rückgängig gemacht werden."
        confirmLabel="Löschen"
        variant="destructive"
        onConfirm={() => {
          if (confirmDeleteId) deleteReview(confirmDeleteId);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <ConfirmDialog
        open={confirmSend}
        title="Vergangene Proband:innen anschreiben"
        description={
          loadingCount
            ? "Anzahl der Empfänger:innen wird ermittelt..."
            : sendCount === null
              ? "Anzahl konnte nicht ermittelt werden. Trotzdem fortfahren? Es wird je Proband:in genau eine Bewertungs-Mail verschickt."
              : `${sendCount} Proband:in${
                  sendCount === 1 ? "" : "nen"
                } erhalten einmalig eine Bewertungs-Mail. Proband:innen mit zukünftigen Terminen, bereits abgegebener Bewertung oder bereits versendeter Anfrage werden übersprungen.`
        }
        confirmLabel={sending ? "Versendet..." : "Jetzt verschicken"}
        onConfirm={sendPast}
        onCancel={() => setConfirmSend(false)}
      />
    </div>
  );
}
