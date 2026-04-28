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
import { Loader2, AlertTriangle, ArrowRight, Search } from "lucide-react";
import { formatPersonName } from "@/lib/utils";

// Merge another contact INTO the contact this modal was opened from.
// "primary" = current contact (kept). "merged" = picked target (deleted).
// Field-level rule: primary wins on conflicts; null/empty fields on
// primary fall back to merged's value.
//
// Search uses the existing /api/admin/contact-search endpoint and is
// scoped client-side to the same source. PR 5 will add patient support.

type Source = "auszubildende"; // "patient" added in PR 5

type SearchResult = {
  id: string;
  source: "auszubildende" | "patient";
  firstName: string | null;
  lastName: string | null;
  email: string;
  title: string | null;
  companyName: string | null;
};

type MergeResult = {
  ok: boolean;
  emailsMoved: number;
  bookingsMoved: number;
  ordersMoved: number;
  fieldsUpdated: number;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: Source;
  primaryId: string;
  primaryLabel: string;
  /** Called after a successful merge so the page can navigate or refresh. */
  onMerged?: (result: MergeResult) => void;
}

export function MergeContactModal({
  open,
  onOpenChange,
  source,
  primaryId,
  primaryLabel,
  onMerged,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [target, setTarget] = useState<SearchResult | null>(null);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset on open/close so reopening starts fresh.
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setTarget(null);
      setError(null);
    }
  }, [open]);

  // Debounced search hits the existing admin contact-search endpoint and
  // filters to the same source as the primary contact.
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
        const filtered = data.filter(
          (r) => r.source === source && r.id !== primaryId,
        );
        setResults(filtered);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, target, source, primaryId]);

  const formatLabel = (r: SearchResult): string => {
    return (
      formatPersonName({
        title: r.title,
        firstName: r.firstName,
        lastName: r.lastName,
      }) || r.email
    );
  };

  const submitMerge = async () => {
    if (!target) return;
    setMerging(true);
    setError(null);
    try {
      const res = await fetch("/api/inbox/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          primaryId,
          mergedId: target.id,
        }),
      });
      let json: Partial<MergeResult> & { error?: string } = {};
      try {
        json = await res.json();
      } catch {
        json = { error: `Server hat keine JSON-Antwort gesendet (HTTP ${res.status})` };
      }
      if (!res.ok || !json.ok) {
        setError(json.error || `HTTP ${res.status}`);
        return;
      }
      onMerged?.(json as MergeResult);
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Netzwerkfehler: ${err.message}`
          : String(err),
      );
    } finally {
      setMerging(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Profile zusammenführen</DialogTitle>
          <DialogDescription>
            Wähle einen anderen Kontakt aus. Alle E-Mails, Buchungen und
            fehlenden Felder werden auf <strong>{primaryLabel}</strong>{" "}
            übertragen. Der ausgewählte Kontakt wird danach gelöscht.
          </DialogDescription>
        </DialogHeader>

        {!target ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name oder E-Mail suchen..."
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
              <p className="text-sm text-muted-foreground">
                Keine Treffer.
              </p>
            )}

            <div className="max-h-72 overflow-y-auto space-y-1">
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
          <div className="space-y-4">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
              <div className="rounded-[10px] bg-emerald-50 border border-emerald-200 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  Bleibt erhalten
                </div>
                <div className="text-sm font-medium mt-1 truncate">
                  {primaryLabel}
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <div className="rounded-[10px] bg-red-50 border border-red-200 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wide text-red-700">
                  Wird gelöscht
                </div>
                <div className="text-sm font-medium mt-1 truncate">
                  {formatLabel(target)}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {target.email}
                </div>
              </div>
            </div>

            <div className="rounded-[10px] bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Achtung:</strong> Diese Aktion kann nicht
                rückgängig gemacht werden.{" "}
                <span className="text-muted-foreground">
                  Bei Konflikten gewinnt das verbleibende Profil. Leere
                  Felder werden aus dem gelöschten Profil ergänzt. Notizen
                  werden zusammengefügt.
                </span>
              </div>
            </div>

            <button
              onClick={() => setTarget(null)}
              className="text-xs text-[#0066FF] hover:underline"
            >
              ← Anderen Kontakt auswählen
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-[10px] bg-red-50 border border-red-200 p-3 text-xs text-red-900">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={merging}
          >
            Abbrechen
          </Button>
          <Button
            onClick={submitMerge}
            disabled={!target || merging}
            className="bg-red-600 hover:bg-red-700"
          >
            {merging ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Zusammenführen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
