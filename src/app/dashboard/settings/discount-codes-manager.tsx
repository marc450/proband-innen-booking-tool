"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertDialog, ConfirmDialog } from "@/components/confirm-dialog";
import { TableHeaderBar } from "@/components/table/table-header-bar";
import { SortableHead } from "@/components/table/sortable-head";
import { useTableSort } from "@/hooks/use-table-sort";
import { Plus, Power, PowerOff, Trash2, Shuffle } from "lucide-react";

// Random coupon code generator — avoids ambiguous characters (0/O, 1/I/L)
// so codes stay readable when shared verbally or over chat.
function generateRandomCode(length = 10): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let result = "";
  const crypto = typeof window !== "undefined" ? window.crypto : undefined;
  if (crypto?.getRandomValues) {
    const buf = new Uint32Array(length);
    crypto.getRandomValues(buf);
    for (let i = 0; i < length; i++) {
      result += alphabet[buf[i] % alphabet.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      result += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
  }
  return result;
}
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface DiscountCode {
  id: string;
  code: string;
  active: boolean;
  times_redeemed: number;
  max_redemptions: number | null;
  percent_off: number | null;
  created: number;
}

type SortKey = "code" | "discount" | "redemptions" | "status" | "created";

export function DiscountCodesManager() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alertState, setAlertState] = useState<{ title: string; description: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DiscountCode | null>(null);

  const [code, setCode] = useState("");
  const [percentOff, setPercentOff] = useState("10");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Sorting
  const { sortKey, sortDir, handleSort } = useTableSort<SortKey>("code", "asc");

  const sortedCodes = useMemo(() => {
    const sorted = [...codes];
    const dir = sortDir === "asc" ? 1 : -1;
    sorted.sort((a, b) => {
      switch (sortKey) {
        case "code":
          return a.code.localeCompare(b.code) * dir;
        case "discount":
          return ((a.percent_off || 0) - (b.percent_off || 0)) * dir;
        case "redemptions":
          return (a.times_redeemed - b.times_redeemed) * dir;
        case "status":
          return ((a.active ? 1 : 0) - (b.active ? 1 : 0)) * dir;
        case "created":
          return (a.created - b.created) * dir;
        default:
          return 0;
      }
    });
    return sorted;
  }, [codes, sortKey, sortDir]);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/discount-codes");
    if (res.ok) {
      setCodes(await res.json());
    } else {
      const data = await res.json();
      setAlertState({ title: "Fehler", description: data.error || "Rabattcodes konnten nicht geladen werden." });
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setCode("");
    setPercentOff("10");
    setMaxRedemptions("");
    setCreateError(null);
  };

  const handleCreate = async () => {
    if (!code.trim()) {
      setCreateError("Bitte einen Code eingeben.");
      return;
    }
    setSaving(true);
    setCreateError(null);

    const res = await fetch("/api/admin/discount-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code.trim(),
        percentOff: Number(percentOff),
        maxRedemptions: maxRedemptions.trim() === "" ? null : Number(maxRedemptions),
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setCreateError(data.error || "Fehler beim Erstellen.");
      return;
    }

    setShowCreate(false);
    resetForm();
    await load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    const res = await fetch(`/api/admin/discount-codes/${target.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setAlertState({ title: "Fehler", description: data.error || "Rabattcode konnte nicht gelöscht werden." });
      return;
    }
    setCodes((prev) => prev.filter((x) => x.id !== target.id));
  };

  const toggleActive = async (c: DiscountCode) => {
    const res = await fetch(`/api/admin/discount-codes/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !c.active }),
    });
    if (!res.ok) {
      const data = await res.json();
      setAlertState({ title: "Fehler", description: data.error || "Status konnte nicht geändert werden." });
      return;
    }
    setCodes((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: !c.active } : x)));
  };

  return (
    <div className="space-y-4">
      <AlertDialog
        open={!!alertState}
        title={alertState?.title ?? ""}
        description={alertState?.description ?? ""}
        onClose={() => setAlertState(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Rabattcode löschen?"
        description={
          deleteTarget
            ? `Der Rabattcode "${deleteTarget.code}" wird endgültig gelöscht und kann danach nicht mehr eingelöst werden.`
            : ""
        }
        confirmLabel="Löschen"
        variant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <Dialog
        open={showCreate}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreate(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Neuen Rabattcode anlegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <div className="flex gap-2">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="z.B. WELCOME10"
                  className="font-mono flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCode(generateRandomCode())}
                  title="Zufälligen Code generieren"
                  className="shrink-0"
                >
                  <Shuffle className="h-4 w-4" />
                  Zufall
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Nur Buchstaben, Zahlen, Bindestriche und Unterstriche.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Rabatt in % *</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={percentOff}
                onChange={(e) => setPercentOff(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Max. Einlösungen</Label>
              <Input
                type="number"
                min={1}
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(e.target.value)}
                placeholder="Leer lassen für unbegrenzt"
              />
            </div>
            <div className="rounded-lg bg-muted px-3 py-2.5 text-xs text-muted-foreground">
              Rabattcodes gelten nur für Ärzt:innen-Kurse (Einzelkurse, Curricula, Komplettpakete). Bei
              Curricula und Komplettpaketen wird der Code zusätzlich zum integrierten 10%-Rabatt angewendet.
            </div>
            {createError && <p className="text-sm text-destructive">{createError}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreate(false);
                resetForm();
              }}
              disabled={saving}
            >
              Abbrechen
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Wird angelegt..." : "Anlegen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TableHeaderBar
        title="Rabattcodes"
        count={codes.length}
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Rabattcode anlegen
          </Button>
        }
      />

      {loading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Lade Rabattcodes...</div>
          ) : codes.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Noch keine Rabattcodes vorhanden.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Code" sortKey="code" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
                  <SortableHead label="Rabatt" sortKey="discount" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
                  <SortableHead label="Einlösungen" sortKey="redemptions" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
                  <SortableHead label="Status" sortKey="status" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
                  <SortableHead label="Erstellt" sortKey="created" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCodes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-medium">{c.code}</TableCell>
                    <TableCell>{c.percent_off != null ? `${c.percent_off}%` : "–"}</TableCell>
                    <TableCell className="text-sm">
                      {c.times_redeemed}
                      {c.max_redemptions != null ? ` / ${c.max_redemptions}` : " / ∞"}
                    </TableCell>
                    <TableCell>
                      {c.active ? (
                        <Badge>Aktiv</Badge>
                      ) : (
                        <Badge variant="secondary">Inaktiv</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(c.created * 1000), "dd.MM.yyyy", { locale: de })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(c)}
                          title={c.active ? "Deaktivieren" : "Aktivieren"}
                        >
                          {c.active ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(c)}
                          title="Löschen"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
    </div>
  );
}
