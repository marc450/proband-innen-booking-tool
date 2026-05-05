"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertDialog, ConfirmDialog } from "@/components/confirm-dialog";
import { Plus, Trash2 } from "lucide-react";
import type { MerchProduct, MerchProductVariant } from "@/lib/types";

interface Props {
  initialProducts: MerchProduct[];
  initialVariants: MerchProductVariant[];
}

export function ProductsManager({ initialProducts, initialVariants }: Props) {
  const supabase = createClient();
  const [products, setProducts] = useState(initialProducts);
  const [variants, setVariants] = useState(initialVariants);
  const [alertState, setAlertState] = useState<{ title: string; description: string } | null>(null);

  // Product dialog
  const [editing, setEditing] = useState<MerchProduct | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [pForm, setPForm] = useState<{ slug: string; title: string; subtitle: string; description: string; image_url: string; image_url_2: string; image_url_3: string; image_url_4: string; image_url_5: string; image_url_6: string; is_active: boolean }>({
    slug: "",
    title: "",
    subtitle: "",
    description: "",
    image_url: "",
    image_url_2: "",
    image_url_3: "",
    image_url_4: "",
    image_url_5: "",
    image_url_6: "",
    is_active: true,
  });

  // Variant dialog
  const [editingVariant, setEditingVariant] = useState<MerchProductVariant | null>(null);
  const [variantParentId, setVariantParentId] = useState<string | null>(null);
  const [showVariantDialog, setShowVariantDialog] = useState(false);
  const [vForm, setVForm] = useState<{ name: string; color: string; size: string; sku: string; price_gross_eur: string; vat_rate: string; stock: string; image_url: string; is_active: boolean }>({
    name: "",
    color: "",
    size: "one-size",
    sku: "",
    price_gross_eur: "35",
    vat_rate: "0.19",
    stock: "0",
    image_url: "",
    is_active: true,
  });

  // Delete confirms
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleteVariantId, setDeleteVariantId] = useState<string | null>(null);

  const variantsByProduct = useMemo(() => {
    const map = new Map<string, MerchProductVariant[]>();
    for (const v of variants) {
      if (!map.has(v.product_id)) map.set(v.product_id, []);
      map.get(v.product_id)!.push(v);
    }
    return map;
  }, [variants]);

  // ── Product helpers ───────────────────────────────────────────────
  const openProductDialog = (p: MerchProduct | null) => {
    setEditing(p);
    setPForm({
      slug: p?.slug ?? "",
      title: p?.title ?? "",
      subtitle: p?.subtitle ?? "",
      description: p?.description ?? "",
      image_url: p?.image_url ?? "",
      image_url_2: p?.image_url_2 ?? "",
      image_url_3: p?.image_url_3 ?? "",
      image_url_4: p?.image_url_4 ?? "",
      image_url_5: p?.image_url_5 ?? "",
      image_url_6: p?.image_url_6 ?? "",
      is_active: p?.is_active ?? true,
    });
    setShowDialog(true);
  };

  const saveProduct = async () => {
    if (!pForm.slug.trim() || !pForm.title.trim()) {
      setAlertState({ title: "Fehler", description: "Slug und Titel sind Pflicht." });
      return;
    }
    const payload = {
      slug: pForm.slug.trim(),
      title: pForm.title.trim(),
      subtitle: pForm.subtitle.trim() || null,
      description: pForm.description.trim() || null,
      image_url: pForm.image_url.trim() || null,
      image_url_2: pForm.image_url_2.trim() || null,
      image_url_3: pForm.image_url_3.trim() || null,
      image_url_4: pForm.image_url_4.trim() || null,
      image_url_5: pForm.image_url_5.trim() || null,
      image_url_6: pForm.image_url_6.trim() || null,
      is_active: pForm.is_active,
    };

    if (editing) {
      const { data, error } = await supabase
        .from("merch_products")
        .update(payload)
        .eq("id", editing.id)
        .select()
        .single();
      if (error) {
        setAlertState({ title: "Fehler", description: error.message });
        return;
      }
      setProducts((prev) => prev.map((p) => (p.id === editing.id ? (data as MerchProduct) : p)));
    } else {
      const { data, error } = await supabase
        .from("merch_products")
        .insert(payload)
        .select()
        .single();
      if (error) {
        setAlertState({ title: "Fehler", description: error.message });
        return;
      }
      setProducts((prev) => [...prev, data as MerchProduct]);
    }
    setShowDialog(false);
  };

  const doDeleteProduct = async () => {
    if (!deleteProductId) return;
    const id = deleteProductId;
    setDeleteProductId(null);
    const { error } = await supabase.from("merch_products").delete().eq("id", id);
    if (error) {
      setAlertState({ title: "Fehler", description: error.message });
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setVariants((prev) => prev.filter((v) => v.product_id !== id));
  };

  // ── Variant helpers ───────────────────────────────────────────────
  const openVariantDialog = (productId: string, v: MerchProductVariant | null) => {
    setEditingVariant(v);
    setVariantParentId(productId);
    setVForm({
      name: v?.name ?? "",
      color: v?.color ?? "",
      size: v?.size ?? "one-size",
      sku: v?.sku ?? "",
      price_gross_eur: v ? (v.price_gross_cents / 100).toString() : "35",
      vat_rate: v ? v.vat_rate.toString() : "0.19",
      stock: v ? v.stock.toString() : "0",
      image_url: v?.image_url ?? "",
      is_active: v?.is_active ?? true,
    });
    setShowVariantDialog(true);
  };

  const saveVariant = async () => {
    if (!variantParentId) return;
    if (!vForm.name.trim()) {
      setAlertState({ title: "Fehler", description: "Name ist Pflicht." });
      return;
    }
    const priceCents = Math.round(parseFloat(vForm.price_gross_eur) * 100) || 0;
    const payload = {
      product_id: variantParentId,
      name: vForm.name.trim(),
      color: vForm.color.trim() || null,
      size: vForm.size.trim() || null,
      sku: vForm.sku.trim() || null,
      price_gross_cents: priceCents,
      vat_rate: parseFloat(vForm.vat_rate) || 0.19,
      stock: Math.max(parseInt(vForm.stock) || 0, 0),
      image_url: vForm.image_url.trim() || null,
      is_active: vForm.is_active,
    };

    if (editingVariant) {
      const { data, error } = await supabase
        .from("merch_product_variants")
        .update(payload)
        .eq("id", editingVariant.id)
        .select()
        .single();
      if (error) {
        setAlertState({ title: "Fehler", description: error.message });
        return;
      }
      setVariants((prev) => prev.map((x) => (x.id === editingVariant.id ? (data as MerchProductVariant) : x)));
    } else {
      const { data, error } = await supabase
        .from("merch_product_variants")
        .insert(payload)
        .select()
        .single();
      if (error) {
        setAlertState({ title: "Fehler", description: error.message });
        return;
      }
      setVariants((prev) => [...prev, data as MerchProductVariant]);
    }
    setShowVariantDialog(false);
  };

  const updateStockInline = async (variantId: string, newStock: number) => {
    const clamped = Math.max(newStock, 0);
    const { data, error } = await supabase
      .from("merch_product_variants")
      .update({ stock: clamped })
      .eq("id", variantId)
      .select()
      .single();
    if (error) {
      setAlertState({ title: "Fehler", description: error.message });
      return;
    }
    setVariants((prev) => prev.map((v) => (v.id === variantId ? (data as MerchProductVariant) : v)));
  };

  const doDeleteVariant = async () => {
    if (!deleteVariantId) return;
    const id = deleteVariantId;
    setDeleteVariantId(null);
    const { error } = await supabase.from("merch_product_variants").delete().eq("id", id);
    if (error) {
      setAlertState({ title: "Fehler", description: error.message });
      return;
    }
    setVariants((prev) => prev.filter((v) => v.id !== id));
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <AlertDialog
        open={!!alertState}
        title={alertState?.title ?? ""}
        description={alertState?.description ?? ""}
        onClose={() => setAlertState(null)}
      />
      <ConfirmDialog
        open={!!deleteProductId}
        title="Produkt löschen?"
        description="Das Produkt und alle Varianten werden gelöscht. Bestehende Bestellungen bleiben erhalten (Snapshot)."
        confirmLabel="Löschen"
        variant="destructive"
        onConfirm={doDeleteProduct}
        onCancel={() => setDeleteProductId(null)}
      />
      <ConfirmDialog
        open={!!deleteVariantId}
        title="Variante löschen?"
        description="Die Variante wird gelöscht. Bestehende Bestellungen bleiben erhalten (Snapshot)."
        confirmLabel="Löschen"
        variant="destructive"
        onConfirm={doDeleteVariant}
        onCancel={() => setDeleteVariantId(null)}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Merch-Produkte</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Produkte und Lagerbestand für den Shop auf ephia.de/merch.
          </p>
        </div>
        <Button onClick={() => openProductDialog(null)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Produkt anlegen
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          Noch keine Produkte.
        </div>
      ) : (
        <div className="space-y-6">
          {products.map((p) => {
            const vs = variantsByProduct.get(p.id) ?? [];
            const totalStock = vs.reduce((n, v) => n + v.stock, 0);
            return (
              <div key={p.id} className="bg-card rounded-[10px] ring-1 ring-black/5 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-black/5 gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold truncate">{p.title}</h2>
                      {p.is_active ? (
                        <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">Aktiv</Badge>
                      ) : (
                        <Badge variant="secondary">Versteckt</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Slug: <code className="font-mono">{p.slug}</code> · Bestand gesamt: {totalStock}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openVariantDialog(p.id, null)}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Variante
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openProductDialog(p)}>
                      Bearbeiten
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteProductId(p.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {vs.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Keine Varianten. Füge mindestens eine Variante hinzu, um das Produkt verkaufen zu können.
                  </div>
                ) : (
                  // table-fixed with explicit column widths so the two
                  // product tables (EPHIA Cap vs SONJA X EPHIA T-Shirt)
                  // align column-by-column regardless of row content.
                  <Table className="table-fixed w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[220px]">Name</TableHead>
                        <TableHead className="w-[110px]">Farbe</TableHead>
                        <TableHead className="w-[110px]">Größe</TableHead>
                        <TableHead className="w-[170px]">SKU</TableHead>
                        <TableHead className="w-[130px] text-right">Preis brutto</TableHead>
                        <TableHead className="w-[80px] text-right">MwSt.</TableHead>
                        <TableHead className="w-[100px] text-right">Bestand</TableHead>
                        <TableHead className="w-[120px]">Status</TableHead>
                        <TableHead className="w-[150px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vs.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell>{v.name}</TableCell>
                          <TableCell className="text-muted-foreground">{v.color || "–"}</TableCell>
                          <TableCell className="text-muted-foreground">{v.size || "–"}</TableCell>
                          <TableCell className="font-mono text-xs">{v.sku || "–"}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {(v.price_gross_cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {(v.vat_rate * 100).toFixed(0)}%
                          </TableCell>
                          <TableCell className="text-right">
                            <input
                              type="number"
                              min={0}
                              defaultValue={v.stock}
                              key={`stock-${v.id}-${v.stock}`}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                if (val !== v.stock) updateStockInline(v.id, val);
                              }}
                              className={`w-16 text-right bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary focus:outline-none tabular-nums ${v.stock === 0 ? "text-destructive font-semibold" : ""}`}
                            />
                          </TableCell>
                          <TableCell>
                            {v.is_active ? (
                              <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">Aktiv</Badge>
                            ) : (
                              <Badge variant="secondary">Versteckt</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openVariantDialog(p.id, v)}>
                                Bearbeiten
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteVariantId(v.id)}
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
          })}
        </div>
      )}

      {/* Product dialog */}
      <Dialog
        open={showDialog}
        onOpenChange={(open) => {
          if (!open) setShowDialog(false);
        }}
      >
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Produkt bearbeiten" : "Neues Produkt"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Slug *</Label>
                <Input value={pForm.slug} onChange={(e) => setPForm((f) => ({ ...f, slug: e.target.value }))} placeholder="ephia-cap" />
              </div>
              <div className="space-y-1.5">
                <Label>Titel *</Label>
                <Input value={pForm.title} onChange={(e) => setPForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Untertitel</Label>
              <Input value={pForm.subtitle} onChange={(e) => setPForm((f) => ({ ...f, subtitle: e.target.value }))} placeholder='"SCHATTEN SPART BOTOX"' />
            </div>
            <div className="space-y-1.5">
              <Label>Bild-URL (Hauptbild)</Label>
              <Input value={pForm.image_url} onChange={(e) => setPForm((f) => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
              <p className="text-xs text-muted-foreground">Am besten ein 4:3 oder 1:1 Produktfoto in hoher Qualität.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Bild-URL 2 (optional)</Label>
              <Input value={pForm.image_url_2} onChange={(e) => setPForm((f) => ({ ...f, image_url_2: e.target.value }))} placeholder="https://..." />
              <p className="text-xs text-muted-foreground">Zusätzliche Ansicht, erscheint als Thumbnail unter dem Hauptbild.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Bild-URL 3 (optional)</Label>
              <Input value={pForm.image_url_3} onChange={(e) => setPForm((f) => ({ ...f, image_url_3: e.target.value }))} placeholder="https://..." />
              <p className="text-xs text-muted-foreground">Zusätzliche Ansicht, erscheint als Thumbnail unter dem Hauptbild.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Bild-URL 4 (optional)</Label>
              <Input value={pForm.image_url_4} onChange={(e) => setPForm((f) => ({ ...f, image_url_4: e.target.value }))} placeholder="https://..." />
              <p className="text-xs text-muted-foreground">Zusätzliche Ansicht, erscheint als Thumbnail unter dem Hauptbild.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Bild-URL 5 (optional)</Label>
              <Input value={pForm.image_url_5} onChange={(e) => setPForm((f) => ({ ...f, image_url_5: e.target.value }))} placeholder="https://..." />
              <p className="text-xs text-muted-foreground">Zusätzliche Ansicht, erscheint als Thumbnail unter dem Hauptbild.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Bild-URL 6 (optional)</Label>
              <Input value={pForm.image_url_6} onChange={(e) => setPForm((f) => ({ ...f, image_url_6: e.target.value }))} placeholder="https://..." />
              <p className="text-xs text-muted-foreground">Zusätzliche Ansicht, erscheint als Thumbnail unter dem Hauptbild.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Beschreibung</Label>
              <Textarea
                rows={6}
                value={pForm.description}
                onChange={(e) => setPForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Erscheint als Fließtext unter dem Produkttitel auf der Shop-Seite. Leerzeile erzwingt einen Absatz."
              />
              <p className="text-xs text-muted-foreground">
                Wird 1:1 auf <code className="font-mono">/merch/{pForm.slug || "…"}</code> angezeigt. Eine Leerzeile erzeugt einen Absatzwechsel.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={pForm.is_active}
                onChange={(e) => setPForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              Aktiv (im Shop sichtbar)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Abbrechen</Button>
            <Button onClick={saveProduct}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variant dialog */}
      <Dialog
        open={showVariantDialog}
        onOpenChange={(open) => {
          if (!open) setShowVariantDialog(false);
        }}
      >
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVariant ? "Variante bearbeiten" : "Neue Variante"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={vForm.name} onChange={(e) => setVForm((f) => ({ ...f, name: e.target.value }))} placeholder="EPHIA Cap Schwarz" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Farbe</Label>
                <Input value={vForm.color} onChange={(e) => setVForm((f) => ({ ...f, color: e.target.value }))} placeholder="Schwarz" />
              </div>
              <div className="space-y-1.5">
                <Label>Größe</Label>
                <Input value={vForm.size} onChange={(e) => setVForm((f) => ({ ...f, size: e.target.value }))} placeholder="one-size oder M" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Preis brutto (€)</Label>
                <Input type="number" step="0.01" value={vForm.price_gross_eur} onChange={(e) => setVForm((f) => ({ ...f, price_gross_eur: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>MwSt-Satz</Label>
                <Input type="number" step="0.01" value={vForm.vat_rate} onChange={(e) => setVForm((f) => ({ ...f, vat_rate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Bestand</Label>
                <Input type="number" min={0} value={vForm.stock} onChange={(e) => setVForm((f) => ({ ...f, stock: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>SKU (optional)</Label>
              <Input value={vForm.sku} onChange={(e) => setVForm((f) => ({ ...f, sku: e.target.value }))} placeholder="CAP-SCHWARZ-OS" />
            </div>
            <div className="space-y-1.5">
              <Label>Bild-URL (optional)</Label>
              <Input
                value={vForm.image_url}
                onChange={(e) => setVForm((f) => ({ ...f, image_url: e.target.value }))}
                placeholder="https://..."
              />
              <p className="text-xs text-muted-foreground">
                Variantenspezifisches Bild (z.B. Schwarz vs. Beige). Wird im Shop bevorzugt vor dem Produkt-Hauptbild gezeigt. Leer lassen, um das Produkt-Bild zu verwenden.
              </p>
              {vForm.image_url.trim() && (
                // Live preview of the URL the admin pasted, so they can sanity-check
                // that it loads + looks right before saving. eslint-disable: it's an
                // arbitrary HTTPS URL, next/image would need every host whitelisted.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={vForm.image_url.trim()}
                  alt="Vorschau"
                  className="mt-2 h-32 w-32 object-cover rounded-[10px] border border-border"
                />
              )}
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={vForm.is_active}
                onChange={(e) => setVForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              Aktiv (im Shop verkaufbar)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVariantDialog(false)}>Abbrechen</Button>
            <Button onClick={saveVariant}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
