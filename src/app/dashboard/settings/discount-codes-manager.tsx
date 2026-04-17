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

import { SortableHead } from "@/components/table/sortable-head";
import { useTableSort } from "@/hooks/use-table-sort";
import { Plus, Power, PowerOff, Trash2, Shuffle, Copy, Check } from "lucide-react";

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
  // Cents (e.g. 5000 = 50,00 €). Null when the code uses percent_off.
  amount_off: number | null;
  currency: string | null;
  created: number;
  created_by: string | null;
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
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");
  const [percentOff, setPercentOff] = useState("10");
  const [amountOffEur, setAmountOffEur] = useState("50");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyCode = async (c: DiscountCode) => {
    try {
      await navigator.clipboard.writeText(c.code);
      setCopiedId(c.id);
      setTimeout(() => setCopiedId((cur) => (cur === c.id ? null : cur)), 1500);
    } catch {
      // Ignore clipboard errors silently
    }
  };

  // Sorting
  const { sortKey, sortDir, handleSort } = useTableSort<SortKey>("created", "desc");

  const sortedCodes = useMemo(() => {
    const sorted = [...codes];
    const dir = sortDir === "asc" ? 1 : -1;
    sorted.sort((a, b) => {
      switch (sortKey) {
        case "code":
          return a.code.localeCompare(b.code) * dir;
        case "discount":
          // Sort percent and absolute codes by their "weight". Percent
          // codes use the percent value directly; absolute codes use
          // the euro amount. Absolute codes end up after percent codes
          // for equal numeric values — acceptable for a quick glance.
          return (
            ((a.percent_off ?? (a.amount_off ? a.amount_off / 100 : 0)) -
              (b.percent_off ?? (b.amount_off ? b.amount_off / 100 : 0))) *
            dir
          );
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
    setDiscountType("percent");
    setPercentOff("10");
    setAmountOffEur("50");
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
        discountType,
        percentOff: discountType === "percent" ? Number(percentOff) : undefined,
        amountOffEur: discountType === "amount" ? Number(amountOffEur) : undefined,
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
            <div className="space-y-2">
              <Label>Rabattart *</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={discountType === "percent" ? "default" : "outline"}
                  onClick={() => setDiscountType("percent")}
                  className="flex-1"
                >
                  Prozent
                </Button>
                <Button
                  type="button"
                  variant={discountType === "amount" ? "default" : "outline"}
                  onClick={() => setDiscountType("amount")}
                  className="flex-1"
                >
                  Betrag (EUR)
                </Button>
              </div>
            </div>

            {discountType === "percent" ? (
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
            ) : (
              <div className="space-y-1.5">
                <Label>Rabatt in EUR *</Label>
                <Input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={amountOffEur}
                  onChange={(e) => setAmountOffEur(e.target.value)}
                  placeholder="z.B. 50"
                />
                <p className="text-xs text-muted-foreground">
                  Ganze Euro-Beträge empfohlen (z.B. 50 für 50,00 €).
                </p>
              </div>
            )}
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

      <div className="flex items-center justify-between gap-4 mb-6">
        <span className="text-sm text-muted-foreground">{codes.length} Einträge</span>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Rabattcode anlegen
        </Button>
      </div>

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
                  <TableHead>Erstellt von</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCodes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-medium">
                      <div className="inline-flex items-center gap-2">
                        <span>{c.code}</span>
                        <button
                          type="button"
                          onClick={() => copyCode(c)}
                          title="Code kopieren"
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {copiedId === c.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {c.percent_off != null
                        ? `${c.percent_off}%`
                        : c.amount_off != null
                          ? new Intl.NumberFormat("de-DE", {
                              style: "currency",
                              currency: (c.currency || "EUR").toUpperCase(),
                            }).format(c.amount_off / 100)
                          : "–"}
                    </TableCell>
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
                      {format(new Date(c.created * 1000), "dd.MM.yyyy, HH:mm", { locale: de })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.created_by || "–"}
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
