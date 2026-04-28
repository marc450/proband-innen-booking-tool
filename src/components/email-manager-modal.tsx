"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Star, Trash2, Plus } from "lucide-react";

// Multi-email manager. Lists all emails for a contact, lets the user add
// new ones, set any as primary, and delete non-primary entries. Used both
// from the inbox sidebar and the contact profile pages.
//
// Source-agnostic: takes a `source` ("auszubildende" | "patient") and a
// contact `id`. Patient code paths require the GET endpoint to decrypt
// the encrypted_email per row (PR 3); for now patient mode is gated.

export type EmailRow = {
  id: string;
  email: string;
  is_primary: boolean;
  source: string | null;
  created_at: string;
};

type Source = "auszubildende" | "patient";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: Source;
  contactId: string;
  /** Notify parent when the primary email changes so it can refresh state. */
  onPrimaryChange?: (newPrimaryEmail: string) => void;
}

export function EmailManagerModal({
  open,
  onOpenChange,
  source,
  contactId,
  onPrimaryChange,
}: Props) {
  const [emails, setEmails] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [makePrimary, setMakePrimary] = useState(false);
  const [adding, setAdding] = useState(false);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/inbox/emails?source=${source}&id=${encodeURIComponent(contactId)}`,
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || `HTTP ${res.status}`);
        setEmails([]);
      } else {
        setEmails(json.emails || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, source, contactId]);

  const addEmail = async () => {
    if (!newEmail.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/inbox/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          id: contactId,
          email: newEmail,
          makePrimary,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || `HTTP ${res.status}`);
        return;
      }
      setNewEmail("");
      setMakePrimary(false);
      await reload();
      if (makePrimary) onPrimaryChange?.(newEmail.trim().toLowerCase());
    } finally {
      setAdding(false);
    }
  };

  const setPrimary = async (rowId: string, rowEmail: string) => {
    setError(null);
    const res = await fetch(`/api/inbox/emails/${rowId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, action: "setPrimary" }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error || `HTTP ${res.status}`);
      return;
    }
    await reload();
    onPrimaryChange?.(rowEmail);
  };

  const deleteEmail = async (rowId: string) => {
    setError(null);
    const res = await fetch(
      `/api/inbox/emails/${rowId}?source=${source}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error || `HTTP ${res.status}`);
      return;
    }
    await reload();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>E-Mail-Adressen</DialogTitle>
          <DialogDescription>
            Eine Adresse ist primär (für ausgehende E-Mails wie
            Buchungsbestätigungen). Alle anderen sind Aliase, die im
            Posteingang denselben Kontakt finden.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {emails.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Noch keine E-Mail hinterlegt.
              </p>
            )}
            {emails.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-2 rounded-[10px] border border-gray-200 px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm truncate">{e.email}</span>
                    {e.is_primary && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#0066FF] bg-[#0066FF]/10 rounded-full px-2 py-0.5">
                        <Star className="h-2.5 w-2.5 fill-current" /> primär
                      </span>
                    )}
                  </div>
                </div>
                {!e.is_primary && (
                  <button
                    onClick={() => setPrimary(e.id, e.email)}
                    className="text-xs text-[#0066FF] hover:underline shrink-0"
                    title="Als primär festlegen"
                  >
                    Primär
                  </button>
                )}
                <button
                  onClick={() => deleteEmail(e.id)}
                  disabled={e.is_primary}
                  className="text-muted-foreground hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                  title={
                    e.is_primary
                      ? "Primäre E-Mail kann nicht gelöscht werden"
                      : "E-Mail löschen"
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="border-t pt-4 space-y-2">
          <label className="text-xs font-bold uppercase tracking-wide text-gray-700">
            Neue E-Mail hinzufügen
          </label>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="name@beispiel.de"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addEmail();
              }}
              disabled={adding}
            />
            <Button onClick={addEmail} disabled={adding || !newEmail.trim()}>
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={makePrimary}
              onChange={(e) => setMakePrimary(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            Direkt als primär festlegen
          </label>
        </div>

        {error && (
          <div className="rounded-[10px] bg-red-50 border border-red-200 p-3 text-xs text-red-900">
            {error}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
