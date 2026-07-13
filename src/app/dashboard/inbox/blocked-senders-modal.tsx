"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Ban, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BlockedSender {
  id: string;
  pattern: string;
  match_type: "email" | "domain";
  reason: string | null;
  blocked_by_name: string | null;
  created_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Management list for the inbox sender blocklist. Opened from the thread-list
// toolbar. Lists every blocked sender and lets staff unblock one. Blocking
// itself happens per-thread from the conversation pane (the "Ban" button).
export function BlockedSendersModal({ open, onClose }: Props) {
  const [senders, setSenders] = useState<BlockedSender[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/inbox/block-sender");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Laden fehlgeschlagen.");
      setSenders(data.senders || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const unblock = useCallback(
    async (pattern: string) => {
      setRemoving(pattern);
      const previous = senders;
      setSenders((prev) => prev.filter((s) => s.pattern !== pattern));
      try {
        const res = await fetch("/api/inbox/block-sender", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pattern }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setSenders(previous);
          setError(data.error || "Entblocken fehlgeschlagen.");
        }
      } catch {
        setSenders(previous);
        setError("Verbindungsfehler beim Entblocken.");
      } finally {
        setRemoving(null);
      }
    },
    [senders],
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-red-500" />
            Blockierte Absender
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Mails dieser Absender:innen werden automatisch in den Spam verschoben.
          Es gibt keine Slack-Benachrichtigung und keine automatische Antwort.
        </p>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded-[10px] px-3 py-2">
            {error}
          </div>
        )}

        <div className="max-h-[50vh] overflow-y-auto -mx-1 px-1">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : senders.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              Noch keine Absender blockiert.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {senders.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {s.match_type === "domain" ? `@${s.pattern}` : s.pattern}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {formatDate(s.created_at)}
                      {s.blocked_by_name ? ` · ${s.blocked_by_name}` : ""}
                      {s.reason ? ` · ${s.reason}` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => unblock(s.pattern)}
                    disabled={removing === s.pattern}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-50"
                    title="Absender wieder freigeben"
                  >
                    {removing === s.pattern ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                    Freigeben
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
