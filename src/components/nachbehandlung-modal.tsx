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
import { formatPersonName, buildBerlinTimestamp } from "@/lib/utils";

// Kostenlosen Nachbehandlungs-Termin anlegen: dedizierter Slot + Buchung für
// eine:n bestehende:n Proband:in + Terminbestätigung per E-Mail.
//
// Proband:innen-Picker nutzt /api/admin/proband-search (staff-gated Typeahead
// über alle aktiven Proband:innen). Submit → /api/nachbehandlung, danach
// onCreated() damit die Kurs-Detail-Seite neu lädt. Vorlage:
// manual-course-booking-modal.tsx.

type SearchResult = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  /** Session-Datum (YYYY-MM-DD) für den Berlin-Timestamp der Uhrzeit. */
  dateIso: string;
  /** Nach erfolgreichem Anlegen, damit die Seite refreshen kann. */
  onCreated?: (bookingId: string) => void;
}

export function NachbehandlungModal({
  open,
  onOpenChange,
  sessionId,
  dateIso,
  onCreated,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [target, setTarget] = useState<SearchResult | null>(null);
  const [time, setTime] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setTarget(null);
      setTime("");
      setError(null);
    }
  }, [open]);

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
          `/api/admin/proband-search?q=${encodeURIComponent(query)}&limit=10`,
        );
        if (!res.ok) {
          setResults([]);
          return;
        }
        const data = (await res.json()) as SearchResult[];
        setResults(data);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, target]);

  const formatLabel = (r: SearchResult): string =>
    formatPersonName({ firstName: r.firstName, lastName: r.lastName }) || r.email;

  const submit = async () => {
    if (!target || !time) return;
    setCreating(true);
    setError(null);
    try {
      const startTimeIso = buildBerlinTimestamp(dateIso, time);
      const res = await fetch("/api/nachbehandlung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          startTimeIso,
          patientId: target.id,
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
          <DialogTitle>Nachbehandlung hinzufügen</DialogTitle>
          <DialogDescription>
            Legt einen kostenlosen Nachbehandlungs-Termin für eine:n bestehende:n
            Proband:in an. Die Proband:in erhält automatisch eine
            Terminbestätigung. Der Slot ist nicht öffentlich buchbar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!target ? (
            <div className="space-y-2">
              <Label>Proband:in suchen</Label>
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
                <Label htmlFor="nachbehandlung-time">Uhrzeit</Label>
                <Input
                  id="nachbehandlung-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
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
          <Button onClick={submit} disabled={!target || !time || creating}>
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
