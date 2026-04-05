"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { AlertDialog } from "@/components/confirm-dialog";
import { Plus, Power, PowerOff } from "lucide-react";
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

export function DiscountCodesManager() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alertState, setAlertState] = useState<{ title: string; description: string } | null>(null);

  const [code, setCode] = useState("");
  const [percentOff, setPercentOff] = useState("10");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

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
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="z.B. WELCOME10"
                className="font-mono"
              />
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
              Rabattcodes gelten nur für Auszubildende-Kurse (Einzelkurse, Curricula, Komplettpakete). Bei
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

      <div className="flex items-center justify-end">
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Rabattcode anlegen
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
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
                  <TableHead>Code</TableHead>
                  <TableHead>Rabatt</TableHead>
                  <TableHead>Einlösungen</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Erstellt</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((c) => (
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
