"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, AlertTriangle } from "lucide-react";
import { formatPersonName } from "@/lib/utils";

// Manually attach an Auszubildende:r to a course session — no Stripe,
// no email, no Slack, no capacity check. Pure data entry for legacy
// cleanup.
//
// Doctor picker uses the existing /api/admin/contact-search endpoint
// (filtered to source=auszubildende). Submit hits
// /api/admin/manual-course-booking, then onCreated() so the parent
// can refresh the session detail.

type CourseType = "Onlinekurs" | "Praxiskurs" | "Kombikurs" | "Premium";
type BookingStatus = "booked" | "completed" | "cancelled" | "refunded";

type SearchResult = {
  id: string;
  source: "auszubildende" | "patient";
  firstName: string | null;
  lastName: string | null;
  email: string;
  title: string | null;
  companyName: string | null;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  defaultCourseType?: CourseType;
  /** Called after a successful insert so the parent can refresh state. */
  onCreated?: (bookingId: string) => void;
}

const COURSE_TYPES: CourseType[] = [
  "Onlinekurs",
  "Praxiskurs",
  "Kombikurs",
  "Premium",
];
const STATUS_OPTIONS: Array<{ value: BookingStatus; label: string }> = [
  { value: "completed", label: "Abgeschlossen" },
  { value: "booked", label: "Gebucht" },
  { value: "cancelled", label: "Storniert" },
  { value: "refunded", label: "Erstattet" },
];

export function ManualCourseBookingModal({
  open,
  onOpenChange,
  sessionId,
  defaultCourseType = "Kombikurs",
  onCreated,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [target, setTarget] = useState<SearchResult | null>(null);
  const [courseType, setCourseType] = useState<CourseType>(defaultCourseType);
  const [status, setStatus] = useState<BookingStatus>("completed");
  const [updateSeats, setUpdateSeats] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setTarget(null);
      setCourseType(defaultCourseType);
      setStatus("completed");
      setUpdateSeats(false);
      setError(null);
    }
  }, [open, defaultCourseType]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (target) return;
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/admin/contact-search?q=${encodeURIComponent(query)}&limit=10`,
        );
        if (!res.ok) {
          setResults([]);
          return;
        }
        const data = (await res.json()) as SearchResult[];
        setResults(data.filter((r) => r.source === "auszubildende"));
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, target]);

  const formatLabel = (r: SearchResult): string => {
    return (
      formatPersonName({
        title: r.title,
        firstName: r.firstName,
        lastName: r.lastName,
      }) || r.email
    );
  };

  const submit = async () => {
    if (!target) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/manual-course-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          courseType,
          auszubildendeId: target.id,
          status,
          updateSeats,
        }),
      });
      let json: { ok?: boolean; bookingId?: string; error?: string } = {};
      try {
        json = await res.json();
      } catch {
        json = { error: `HTTP ${res.status}` };
      }
      if (!res.ok || !json.ok) {
        setError(json.error || `HTTP ${res.status}`);
        return;
      }
      onCreated?.(json.bookingId!);
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? `Netzwerkfehler: ${err.message}` : String(err),
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Teilnehmer:in manuell hinzufügen</DialogTitle>
          <DialogDescription>
            Direkter Eintrag in <code>course_bookings</code> für Legacy-
            Aufräumen. Keine E-Mail, kein Slack, keine Stripe-Belastung,
            keine Kapazitätsprüfung.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!target ? (
            <div className="space-y-2">
              <Label>Ärzt:in suchen</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Name oder E-Mail..."
                  className="pl-9"
                  autoFocus
                />
              </div>
              {searching && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Suche läuft...
                </div>
              )}
              {!searching && query.trim().length >= 2 && results.length === 0 && (
                <p className="text-sm text-muted-foreground">Keine Treffer.</p>
              )}
              <div className="max-h-56 overflow-y-auto space-y-1">
                {results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setTarget(r)}
                    className="w-full text-left rounded-[10px] border border-gray-200 px-3 py-2 hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-sm font-medium">{formatLabel(r)}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.email}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-[10px] bg-emerald-50 border border-emerald-200 px-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {formatLabel(target)}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {target.email}
                  </div>
                </div>
                <button
                  onClick={() => setTarget(null)}
                  className="text-xs text-[#0066FF] hover:underline shrink-0"
                >
                  Ändern
                </button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-course-type">Kurstyp</Label>
                <select
                  id="manual-course-type"
                  value={courseType}
                  onChange={(e) => setCourseType(e.target.value as CourseType)}
                  className="h-11 w-full rounded-[10px] border border-input bg-white px-4 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {COURSE_TYPES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-status">Status</Label>
                <select
                  id="manual-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as BookingStatus)}
                  className="h-11 w-full rounded-[10px] border border-input bg-white px-4 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-start gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={updateSeats}
                  onChange={(e) => setUpdateSeats(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5"
                />
                <span>
                  <strong>Belegte Plätze um 1 erhöhen.</strong> Standardmäßig
                  aus, weil Legacy-Bookings meist schon zur Kapazität gezählt
                  haben. Anhaken nur, wenn dieser Eintrag wirklich ein
                  zusätzlicher Platz ist.
                </span>
              </label>
            </div>
          )}

          {error && (
            <div className="rounded-[10px] bg-red-50 border border-red-200 p-3 text-xs text-red-900 flex gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={creating}
          >
            Abbrechen
          </Button>
          <Button onClick={submit} disabled={!target || creating}>
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Speichere...
              </>
            ) : (
              "Hinzufügen"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
