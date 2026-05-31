"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Star,
  Trash2,
  Eye,
  EyeOff,
  RefreshCcw,
  MessageSquareText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";

// Supabase typed-join responses come back as arrays for one-to-many
// relationships even when we know there is only one row. We accept the
// union shape (object | array | null) and `unwrap()` at render time so we
// don't have to fight the generated types.
type Joined<T> = T | T[] | null;

interface BookingJoin {
  id: string;
  auszubildende_id: string | null;
  email: string | null;
  last_name: string | null;
  course_sessions: Joined<{
    date_iso: string | null;
    label_de: string | null;
  }>;
  auszubildende: Joined<{
    id: string;
    title: string | null;
    first_name: string | null;
    last_name: string | null;
  }>;
}

interface TemplateJoin {
  title: string | null;
  course_label_de: string | null;
}

export interface ReviewRow {
  id: string;
  rating: number;
  first_name: string;
  body_text: string | null;
  display_title: string | null;
  display_last_initial: string | null;
  is_imported: boolean;
  is_published: boolean;
  submitted_at: string;
  published_at: string | null;
  booking_id: string | null;
  template_id: string | null;
  auszubildende_id: string | null;
  course_bookings: Joined<BookingJoin>;
  // Doctor-anchored reviews (one-time bulk pass) link the doctor directly
  // instead of through a booking.
  auszubildende: Joined<{
    id: string;
    title: string | null;
    first_name: string | null;
    last_name: string | null;
  }>;
  course_templates: Joined<TemplateJoin>;
}

// Anonymous team feedback, grouped by course and only surfaced once a
// course has ≥ feedbackThreshold entries (gate enforced in the loader).
// Items inside a group are shuffled there too so date order doesn't
// give away who wrote what.
export interface InternalFeedbackByCourse {
  templateId: string;
  courseTitle: string;
  items: Array<{
    id: string;
    body: string;
    dateReceived: string;
  }>;
}

type Filter = "all" | "pending" | "published";

interface Props {
  initialReviews: ReviewRow[];
  initialFeedback?: InternalFeedbackByCourse[];
  feedbackThreshold?: number;
}

function unwrap<T>(v: T | T[] | null): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v;
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

export function ReviewsManager({
  initialReviews,
  initialFeedback = [],
  feedbackThreshold = 2,
}: Props) {
  const [reviews, setReviews] = useState<ReviewRow[]>(initialReviews);
  const [filter, setFilter] = useState<Filter>("all");
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmReschedule, setConfirmReschedule] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleResult, setRescheduleResult] = useState<string | null>(null);

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
      const res = await fetch(`/api/admin/reviews/${id}`, {
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
      const res = await fetch(`/api/admin/reviews/${id}`, {
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

  async function rescheduleAll() {
    setRescheduling(true);
    setRescheduleResult(null);
    try {
      const res = await fetch("/api/admin/reschedule-review-emails", {
        method: "POST",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(
          json.error || "Neuplanen fehlgeschlagen, bitte erneut versuchen.",
        );
      }
      const data = await res.json();
      const cancelled = data?.cancelStats?.cancelled ?? 0;
      const cancelFailed = data?.cancelStats?.cancelFailed ?? 0;
      const scheduled = data?.reschedule?.scheduled ?? 0;
      const skipped = data?.reschedule?.skipped ?? 0;
      const errors = data?.reschedule?.errors ?? 0;
      const errorSamples: string[] = data?.reschedule?.errorSamples ?? [];
      const samplesSuffix =
        errors > 0 && errorSamples.length > 0
          ? ` Beispielfehler: ${errorSamples.map((s) => `"${s}"`).join("; ")}.`
          : "";
      setRescheduleResult(
        `Fertig. ${cancelled} alte Mail(s) storniert${
          cancelFailed ? `, ${cancelFailed} fehlgeschlagen` : ""
        }, ${scheduled} neu eingeplant${
          skipped ? `, ${skipped} übersprungen` : ""
        }${errors ? `, ${errors} Fehler` : ""}.${samplesSuffix}`,
      );
    } catch (err) {
      setRescheduleResult(
        err instanceof Error ? err.message : "Da ist etwas schiefgelaufen.",
      );
    } finally {
      setRescheduling(false);
      setConfirmReschedule(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Bewertungen</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bewertungen aus den Kurs-Folge-Mails. Schalte einzelne Bewertungen
            frei, um sie später auf der jeweiligen Kursseite anzuzeigen. Das
            anonyme Team-Feedback wird nie veröffentlicht.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            disabled={rescheduling}
            onClick={() => setConfirmReschedule(true)}
          >
            <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />
            {rescheduling ? "Plant neu..." : "Mails neu planen"}
          </Button>
        </div>
      </div>
      {rescheduleResult && (
        <div className="rounded-[10px] bg-white px-4 py-3 text-sm shadow-sm">
          {rescheduleResult}
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
            const booking = unwrap(r.course_bookings);
            const tpl = unwrap(r.course_templates);
            // Doctor link comes from the booking when present, otherwise
            // straight from the doctor-anchored auszubildende join.
            const azubi =
              (booking ? unwrap(booking.auszubildende) : null) ??
              unwrap(r.auszubildende);
            const session = booking ? unwrap(booking.course_sessions) : null;
            // A null template_id is a general (course-agnostic) review from
            // the one-time bulk past-attendee pass, not an unknown course.
            const courseTitle = r.template_id
              ? tpl?.course_label_de || tpl?.title || "Kurs unbekannt"
              : "Allgemeine Bewertung";
            const azubiName = azubi
              ? [azubi.title, azubi.first_name, azubi.last_name]
                  .filter(Boolean)
                  .join(" ")
              : null;
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
                        {[
                          r.display_title,
                          r.first_name,
                          r.display_last_initial ? `${r.display_last_initial}.` : null,
                        ]
                          .filter(Boolean)
                          .join(" ")}
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
                      {r.is_imported && (
                        <Badge className="bg-[#BF785E]/15 text-[#733D29] hover:bg-[#BF785E]/15 text-[10px]">
                          Importiert
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {courseTitle}
                      {session?.date_iso ? ` · ${formatDate(session.date_iso)}` : ""}
                      {session?.label_de ? ` · ${session.label_de}` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Eingegangen am {formatDate(r.submitted_at)}
                      {r.published_at && (
                        <> · Freigeschaltet am {formatDate(r.published_at)}</>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {azubi && (
                      <Link
                        href={`/dashboard/auszubildende/personen/${azubi.id}`}
                        className="text-xs text-[#0066FF] underline-offset-2 hover:underline"
                      >
                        {azubiName || "Kontakt öffnen"}
                      </Link>
                    )}
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
                    Kein öffentlicher Bewertungstext.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Anonymes Team-Feedback — its own section, decoupled from any
          individual review row. Loader applies the ≥ threshold gate so
          a brand-new entry isn't trivially correlatable to a same-day
          review. Items within a course are shuffled in the loader to
          drop chronological ordering too. */}
      <section className="space-y-3 pt-2">
        <div>
          <h2 className="text-lg font-semibold">Anonymes Team-Feedback</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Strukturell getrennt von den Bewertungen, kein Bezug zu
            Vorname, Buchung oder Datum. Wird je Kurs erst sichtbar, sobald
            mindestens {feedbackThreshold} Einträge vorliegen — so kann
            kein einzelnes Feedback einer einzelnen frischen Bewertung
            zugeordnet werden.
          </p>
        </div>
        {initialFeedback.length === 0 ? (
          <div className="bg-white rounded-[10px] p-6 text-center text-sm text-muted-foreground shadow-sm">
            Noch kein anonymes Feedback freigegeben.
          </div>
        ) : (
          <div className="space-y-4">
            {initialFeedback.map((group) => (
              <div
                key={group.templateId}
                className="bg-white rounded-[10px] shadow-sm p-5 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <MessageSquareText className="h-4 w-4 text-[#733D29]" />
                  <h3 className="text-sm font-semibold">{group.courseTitle}</h3>
                  <Badge variant="secondary" className="text-[10px]">
                    {group.items.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[10px] bg-[#FAEBE1] p-3 text-sm leading-relaxed text-[#733D29] whitespace-pre-wrap"
                    >
                      {item.body}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

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
        open={confirmReschedule}
        title="Bewertungs-Mails neu planen"
        description="Alle bereits gequeuten Bewertungs-Mails werden in Resend storniert und nach den aktuellen Regeln (1 Stunde vor Kursende) neu eingeplant. Bereits versendete Mails sind nicht betroffen."
        confirmLabel="Jetzt neu planen"
        onConfirm={rescheduleAll}
        onCancel={() => setConfirmReschedule(false)}
      />
    </div>
  );
}
