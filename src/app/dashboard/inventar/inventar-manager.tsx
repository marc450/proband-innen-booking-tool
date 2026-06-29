"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Minus, Plus, History, Package, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertDialog } from "@/components/confirm-dialog";
import type {
  InventoryChange,
  InventoryItem,
  InventoryLocation,
  TaskProfileRef,
} from "@/lib/types";

interface Props {
  locations: InventoryLocation[];
  initialItems: InventoryItem[];
  initialChanges: InventoryChange[];
}

function personName(p: TaskProfileRef | null | undefined): string {
  if (!p) return "System";
  const parts = [p.title, p.first_name, p.last_name].filter(Boolean);
  return parts.length ? parts.join(" ") : "Unbekannt";
}

function formatDateTime(iso: string): string {
  try {
    return format(new Date(iso), "dd.MM.yyyy, HH:mm", { locale: de });
  } catch {
    return iso;
  }
}

export function InventarManager({
  locations,
  initialItems,
  initialChanges,
}: Props) {
  const router = useRouter();

  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [changes, setChanges] = useState<InventoryChange[]>(initialChanges);

  const [selectedLocationId, setSelectedLocationId] = useState<string>(
    locations[0]?.id ?? ""
  );

  // Adjust dialog state
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [draftQty, setDraftQty] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedLocation = locations.find((l) => l.id === selectedLocationId) ?? null;

  const locationItems = useMemo(
    () =>
      items
        .filter((i) => i.location_id === selectedLocationId)
        .sort(
          (a, b) =>
            a.product_family.localeCompare(b.product_family) ||
            a.sort_order - b.sort_order
        ),
    [items, selectedLocationId]
  );

  const locationChanges = useMemo(
    () => changes.filter((c) => c.location_id === selectedLocationId),
    [changes, selectedLocationId]
  );

  // Group items by Produktfamilie, preserving the sorted order.
  const groupedItems = useMemo(() => {
    const groups: { family: string; items: InventoryItem[] }[] = [];
    for (const item of locationItems) {
      let group = groups.find((g) => g.family === item.product_family);
      if (!group) {
        group = { family: item.product_family, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    }
    return groups;
  }, [locationItems]);

  const openAdjust = (item: InventoryItem) => {
    setEditItem(item);
    setDraftQty(String(item.quantity));
    setNote("");
    setErrorMsg(null);
  };

  const closeAdjust = () => {
    if (saving) return;
    setEditItem(null);
  };

  const draftNumber = Number.parseInt(draftQty, 10);
  const draftValid = Number.isInteger(draftNumber) && draftNumber >= 0;
  const draftDelta = draftValid && editItem ? draftNumber - editItem.quantity : 0;

  const step = (by: number) => {
    setDraftQty((prev) => {
      const current = Number.parseInt(prev, 10);
      const base = Number.isInteger(current) ? current : 0;
      return String(Math.max(0, base + by));
    });
  };

  const save = async () => {
    if (!editItem || !draftValid) return;
    if (draftDelta === 0) {
      setEditItem(null);
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: editItem.id,
          newQuantity: draftNumber,
          note: note.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Speichern fehlgeschlagen.");
        setSaving(false);
        return;
      }
      // Optimistic local update; router.refresh() then re-syncs canonical
      // data (including the persisted history row with the real timestamp).
      setItems((prev) =>
        prev.map((i) =>
          i.id === editItem.id ? { ...i, quantity: draftNumber } : i
        )
      );
      setEditItem(null);
      setSaving(false);
      router.refresh();
    } catch {
      setErrorMsg("Netzwerkfehler. Bitte erneut versuchen.");
      setSaving(false);
    }
  };

  if (locations.length === 0) {
    return (
      <div className="max-w-5xl">
        <h1 className="text-2xl font-bold mb-2">Inventar</h1>
        <p className="text-muted-foreground">
          Es ist noch kein Standort angelegt.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-2 mb-1">
        <Package className="h-6 w-6 text-[#0066FF]" />
        <h1 className="text-2xl font-bold">Inventar</h1>
      </div>
      <p className="text-muted-foreground mb-5">
        Schrankbestand pro Kursstandort. Jede Änderung wird mit Person und
        Zeitpunkt protokolliert.
      </p>

      {/* Standort-Auswahl */}
      <div className="mb-5 max-w-md">
        <Label className="mb-1.5 block">Standort</Label>
        {locations.length === 1 ? (
          <div className="rounded-[10px] bg-white px-4 py-3 shadow-sm">
            <p className="font-medium">{selectedLocation?.name}</p>
            {selectedLocation?.address && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3.5 w-3.5" />
                {selectedLocation.address}
              </p>
            )}
          </div>
        ) : (
          <Select
            value={selectedLocationId}
            onValueChange={(v) => v && setSelectedLocationId(v)}
          >
            <SelectTrigger>
              <span>{selectedLocation?.name ?? "Standort wählen"}</span>
            </SelectTrigger>
            <SelectContent>
              {locations.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs defaultValue="bestand">
        <TabsList className="mb-4">
          <TabsTrigger value="bestand">
            <Package className="h-4 w-4 mr-1.5" />
            Bestand
          </TabsTrigger>
          <TabsTrigger value="verlauf">
            <History className="h-4 w-4 mr-1.5" />
            Verlauf
          </TabsTrigger>
        </TabsList>

        {/* Bestand */}
        <TabsContent value="bestand">
          <div className="rounded-[10px] bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produkt</TableHead>
                  <TableHead className="w-28 text-right">Bestand</TableHead>
                  <TableHead className="w-32 text-right">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedItems.map((group) => (
                  <FamilyRows
                    key={group.family}
                    family={group.family}
                    items={group.items}
                    onAdjust={openAdjust}
                  />
                ))}
                {locationItems.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground py-8"
                    >
                      Keine Produkte für diesen Standort.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Verlauf */}
        <TabsContent value="verlauf">
          <div className="rounded-[10px] bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">Zeitpunkt</TableHead>
                  <TableHead>Person</TableHead>
                  <TableHead>Produkt</TableHead>
                  <TableHead className="text-right">Vorher</TableHead>
                  <TableHead className="text-right">Nachher</TableHead>
                  <TableHead className="text-right">Δ</TableHead>
                  <TableHead>Notiz</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locationChanges.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formatDateTime(c.created_at)}
                    </TableCell>
                    <TableCell>{personName(c.changer)}</TableCell>
                    <TableCell>
                      {c.item
                        ? `${c.item.product_family} · ${c.item.product_name}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.quantity_before}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {c.quantity_after}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span
                        className={
                          c.delta > 0
                            ? "text-emerald-600"
                            : c.delta < 0
                              ? "text-red-600"
                              : "text-muted-foreground"
                        }
                      >
                        {c.delta > 0 ? `+${c.delta}` : c.delta}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.note || ""}
                    </TableCell>
                  </TableRow>
                ))}
                {locationChanges.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-8"
                    >
                      Noch keine Änderungen.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Bestand anpassen */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && closeAdjust()}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {editItem
                ? `${editItem.product_family} · ${editItem.product_name}`
                : "Bestand anpassen"}
            </DialogTitle>
          </DialogHeader>

          {editItem && (
            <div className="space-y-4 py-1">
              <div className="space-y-1.5">
                <Label>Neuer Bestand</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => step(-1)}
                    disabled={saving}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={draftQty}
                    onChange={(e) => setDraftQty(e.target.value)}
                    className="text-center text-lg font-semibold"
                    disabled={saving}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => step(1)}
                    disabled={saving}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Vorher: {editItem.quantity}
                  {draftValid && draftDelta !== 0 && (
                    <>
                      {" → "}
                      <span className="font-medium text-foreground">
                        {draftNumber}
                      </span>{" "}
                      <span
                        className={
                          draftDelta > 0 ? "text-emerald-600" : "text-red-600"
                        }
                      >
                        ({draftDelta > 0 ? `+${draftDelta}` : draftDelta})
                      </span>
                    </>
                  )}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Notiz (optional)</Label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="z.B. Kurs verbraucht, Nachbestellung eingetroffen"
                  rows={2}
                  disabled={saving}
                />
              </div>

              {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeAdjust} disabled={saving}>
              Abbrechen
            </Button>
            <Button
              onClick={save}
              disabled={saving || !draftValid || draftDelta === 0}
            >
              {saving ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FamilyRows({
  family,
  items,
  onAdjust,
}: {
  family: string;
  items: InventoryItem[];
  onAdjust: (item: InventoryItem) => void;
}) {
  return (
    <>
      <TableRow className="bg-gray-50 hover:bg-gray-50">
        <TableCell
          colSpan={3}
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground py-2"
        >
          {family}
        </TableCell>
      </TableRow>
      {items.map((item) => (
        <TableRow key={item.id}>
          <TableCell className="font-medium">{item.product_name}</TableCell>
          <TableCell className="text-right tabular-nums text-lg font-semibold">
            {item.quantity}
          </TableCell>
          <TableCell className="text-right">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAdjust(item)}
            >
              Anpassen
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
