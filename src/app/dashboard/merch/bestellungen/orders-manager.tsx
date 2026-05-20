"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, Plus, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertDialog } from "@/components/confirm-dialog";
import type { MerchOrder, MerchOrderStatus } from "@/lib/types";

export interface CompProductOption {
  id: string;
  title: string;
  variants: Array<{
    id: string;
    name: string | null;
    color: string | null;
    size: string | null;
    stock: number;
  }>;
}

const statusLabels: Record<MerchOrderStatus, string> = {
  pending: "Ausstehend",
  paid: "Bezahlt",
  shipped: "Versendet",
  cancelled: "Storniert",
  refunded: "Erstattet",
};

const statusOrder: MerchOrderStatus[] = ["pending", "paid", "shipped", "cancelled", "refunded"];

function statusBadge(status: MerchOrderStatus) {
  switch (status) {
    case "paid":
      return <Badge variant="outline" className="text-sky-700 border-sky-300 bg-sky-50">Bezahlt</Badge>;
    case "shipped":
      return <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">Versendet</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Storniert</Badge>;
    case "refunded":
      return <Badge variant="secondary">Erstattet</Badge>;
    default:
      return <Badge variant="secondary">Ausstehend</Badge>;
  }
}

export function OrdersManager({
  initialOrders,
  compProducts,
}: {
  initialOrders: MerchOrder[];
  compProducts: CompProductOption[];
}) {
  const supabase = createClient();
  const [orders, setOrders] = useState(initialOrders);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | MerchOrderStatus>("");
  const [filterType, setFilterType] = useState<"" | "paid" | "complimentary">("");
  const [alertState, setAlertState] = useState<{ title: string; description: string } | null>(null);
  const [compOpen, setCompOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (filterStatus && o.status !== filterStatus) return false;
      if (filterType === "complimentary" && !o.is_complimentary) return false;
      if (filterType === "paid" && o.is_complimentary) return false;
      if (!q) return true;
      const name = [o.first_name, o.last_name].filter(Boolean).join(" ").toLowerCase();
      return (
        name.includes(q) ||
        (o.email || "").toLowerCase().includes(q) ||
        (o.product_title || "").toLowerCase().includes(q) ||
        (o.variant_color || "").toLowerCase().includes(q) ||
        (o.complimentary_reason || "").toLowerCase().includes(q)
      );
    });
  }, [orders, search, filterStatus, filterType]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, o) => {
        if (o.status !== "cancelled" && o.status !== "refunded" && !o.is_complimentary) {
          acc.revenue += o.amount_paid_cents;
        }
        if (o.is_complimentary) acc.compCount += 1;
        else acc.paidCount += 1;
        acc.count += 1;
        return acc;
      },
      { revenue: 0, count: 0, paidCount: 0, compCount: 0 },
    );
  }, [filtered]);

  const updateStatus = async (id: string, newStatus: MerchOrderStatus) => {
    const prev = orders.find((o) => o.id === id);
    if (!prev || prev.status === newStatus) return;
    // Set shipped_at when transitioning to shipped.
    const patch: Record<string, unknown> = { status: newStatus };
    if (newStatus === "shipped" && !prev.shipped_at) patch.shipped_at = new Date().toISOString();

    const { error } = await supabase.from("merch_orders").update(patch).eq("id", id);
    if (error) {
      setAlertState({ title: "Fehler", description: error.message });
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: newStatus, shipped_at: (patch.shipped_at as string) ?? o.shipped_at } : o)));
  };

  return (
    <div className="space-y-4">
      <AlertDialog
        open={!!alertState}
        title={alertState?.title ?? ""}
        description={alertState?.description ?? ""}
        onClose={() => setAlertState(null)}
      />

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Merch-Bestellungen</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totals.paidCount} bezahlt · {totals.compCount} verschenkt · Umsatz{" "}
            {(totals.revenue / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
          </p>
        </div>
        <Button onClick={() => setCompOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Geschenk-Bestellung
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, E-Mail, Produkt, Grund suchen..."
            className="pl-9"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as "" | MerchOrderStatus)}
          className="h-10 rounded-[10px] border border-input bg-card px-3 text-sm cursor-pointer"
        >
          <option value="">Alle Status</option>
          {statusOrder.map((s) => (
            <option key={s} value={s}>{statusLabels[s]}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as "" | "paid" | "complimentary")}
          className="h-10 rounded-[10px] border border-input bg-card px-3 text-sm cursor-pointer"
        >
          <option value="">Alle Typen</option>
          <option value="paid">Nur Bezahlt</option>
          <option value="complimentary">Nur Geschenke</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-[10px] ring-1 ring-black/5 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Datum</TableHead>
              <TableHead>Kund:in</TableHead>
              <TableHead>Produkt</TableHead>
              <TableHead>Variante</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Ärzt:in</TableHead>
              <TableHead>Lieferung</TableHead>
              <TableHead className="text-right">Betrag</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  Keine Bestellungen.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((o) => {
                const name = [o.first_name, o.last_name].filter(Boolean).join(" ") || "–";
                const variantLabel = [o.variant_color, o.variant_size]
                  .filter((x) => x && x !== "one-size")
                  .join(" / ") || o.variant_name || "–";
                const address = [
                  o.shipping_line1,
                  [o.shipping_postal_code, o.shipping_city].filter(Boolean).join(" "),
                  o.shipping_country,
                ]
                  .filter(Boolean)
                  .join(", ");
                return (
                  <TableRow key={o.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(o.created_at), "dd.MM.yyyy, HH:mm", { locale: de })}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{name}</div>
                      <div className="text-xs text-muted-foreground">{o.email}</div>
                      {o.phone && <div className="text-xs text-muted-foreground">{o.phone}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{o.product_title}</TableCell>
                    <TableCell className="text-sm">{variantLabel}</TableCell>
                    <TableCell>
                      {o.is_complimentary ? (
                        <div className="flex flex-col gap-0.5 max-w-[180px]">
                          <Badge variant="outline" className="text-fuchsia-700 border-fuchsia-300 bg-fuchsia-50 gap-1 w-fit">
                            <Gift className="h-3 w-3" />
                            Geschenk
                          </Badge>
                          {o.complimentary_reason && (
                            <span
                              className="text-xs text-muted-foreground truncate"
                              title={o.complimentary_reason}
                            >
                              {o.complimentary_reason}
                            </span>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-sky-700 border-sky-300 bg-sky-50">
                          Bezahlt
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {o.is_doctor ? (
                        <Badge variant="outline" className="text-sky-700 border-sky-300 bg-sky-50">Ja</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Nein</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs max-w-[240px]">
                      {o.pickup_at_event ? (
                        <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                          Abholung
                        </Badge>
                      ) : address ? (
                        <span className="text-muted-foreground">{address}</span>
                      ) : (
                        <span className="text-muted-foreground">–</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <div className="text-sm font-medium">
                        {(o.amount_paid_cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                      </div>
                      {o.shipping_gross_cents > 0 && (
                        <div className="text-xs text-muted-foreground">
                          davon Versand{" "}
                          {(o.shipping_gross_cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {statusBadge(o.status)}
                        <select
                          value={o.status}
                          onChange={(e) => updateStatus(o.id, e.target.value as MerchOrderStatus)}
                          className="text-xs bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary focus:outline-none cursor-pointer text-muted-foreground px-0 py-0.5 mt-1"
                        >
                          {statusOrder.map((s) => (
                            <option key={s} value={s}>{statusLabels[s]}</option>
                          ))}
                        </select>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CompOrderDialog
        open={compOpen}
        onClose={() => setCompOpen(false)}
        compProducts={compProducts}
        onCreated={(order) => {
          setOrders((prev) => [order, ...prev]);
          setCompOpen(false);
        }}
        onError={(msg) => setAlertState({ title: "Fehler", description: msg })}
      />
    </div>
  );
}

function CompOrderDialog({
  open,
  onClose,
  compProducts,
  onCreated,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  compProducts: CompProductOption[];
  onCreated: (order: MerchOrder) => void;
  onError: (message: string) => void;
}) {
  const [productId, setProductId] = useState<string>("");
  const [variantId, setVariantId] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [isDoctor, setIsDoctor] = useState(false);
  const [status, setStatus] = useState<"pending" | "shipped">("pending");
  const [showAddress, setShowAddress] = useState(false);
  const [shippingLine1, setShippingLine1] = useState("");
  const [shippingLine2, setShippingLine2] = useState("");
  const [shippingPostalCode, setShippingPostalCode] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingCountry, setShippingCountry] = useState("");
  const [sendConfirmationEmail, setSendConfirmationEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedProduct = compProducts.find((p) => p.id === productId);
  const variants = selectedProduct?.variants ?? [];
  const selectedVariant = variants.find((v) => v.id === variantId);

  const reset = () => {
    setProductId("");
    setVariantId("");
    setQuantity(1);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setReason("");
    setIsDoctor(false);
    setStatus("pending");
    setShowAddress(false);
    setShippingLine1("");
    setShippingLine2("");
    setShippingPostalCode("");
    setShippingCity("");
    setShippingCountry("");
    setSendConfirmationEmail(false);
    setSubmitting(false);
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
    reset();
  };

  const handleSubmit = async () => {
    if (!variantId) return onError("Bitte Produkt und Variante wählen.");
    if (!reason.trim()) return onError("Bitte einen Grund / Anlass angeben.");
    if (selectedVariant && quantity > selectedVariant.stock) {
      return onError(`Nur noch ${selectedVariant.stock} auf Lager.`);
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/merch-orders/comp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId,
          quantity,
          firstName,
          lastName,
          email,
          phone,
          reason: reason.trim(),
          isDoctor,
          status,
          shippingLine1,
          shippingLine2,
          shippingPostalCode,
          shippingCity,
          shippingCountry,
          sendConfirmationEmail,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.order) {
        onError(data.error || `Bestellung konnte nicht angelegt werden (HTTP ${res.status}).`);
        setSubmitting(false);
        return;
      }
      onCreated(data.order as MerchOrder);
      reset();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unerwarteter Fehler.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : handleClose())}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Geschenk-Bestellung
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <label className="text-xs font-medium block">
              Produkt
              <select
                value={productId}
                onChange={(e) => {
                  setProductId(e.target.value);
                  setVariantId("");
                }}
                className="mt-1 w-full h-10 rounded-[10px] border border-input bg-card px-3 text-sm cursor-pointer"
              >
                <option value="">Bitte wählen...</option>
                {compProducts.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </label>

            {selectedProduct && (
              <label className="text-xs font-medium block">
                Variante
                <select
                  value={variantId}
                  onChange={(e) => setVariantId(e.target.value)}
                  className="mt-1 w-full h-10 rounded-[10px] border border-input bg-card px-3 text-sm cursor-pointer"
                >
                  <option value="">Bitte wählen...</option>
                  {variants.map((v) => {
                    const label = [v.color, v.size]
                      .filter((x) => x && x !== "one-size")
                      .join(" / ") || v.name || v.id;
                    const soldOut = v.stock <= 0;
                    return (
                      <option key={v.id} value={v.id} disabled={soldOut}>
                        {label} {soldOut ? "(ausverkauft)" : `(${v.stock} auf Lager)`}
                      </option>
                    );
                  })}
                </select>
              </label>
            )}

            <label className="text-xs font-medium block">
              Anzahl
              <Input
                type="number"
                min={1}
                max={selectedVariant?.stock ?? 99}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                className="mt-1"
              />
            </label>
          </div>

          <div className="border-t pt-4 grid grid-cols-2 gap-3">
            <label className="text-xs font-medium block">
              Vorname
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1"
              />
            </label>
            <label className="text-xs font-medium block">
              Nachname
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1"
              />
            </label>
            <label className="text-xs font-medium block col-span-2">
              E-Mail (optional)
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </label>
            <label className="text-xs font-medium block col-span-2">
              Telefon (optional)
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1"
              />
            </label>
            <label className="text-xs font-medium flex items-center gap-2 col-span-2">
              <input
                type="checkbox"
                checked={isDoctor}
                onChange={(e) => setIsDoctor(e.target.checked)}
              />
              Empfänger:in ist Ärzt:in
            </label>
          </div>

          <div className="border-t pt-4 space-y-3">
            <label className="text-xs font-medium block">
              Grund / Anlass
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="z.B. Team, Influencer-Geschenk, Sophia Beauty Show"
                className="mt-1"
              />
            </label>
            <label className="text-xs font-medium block">
              Status
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "pending" | "shipped")}
                className="mt-1 w-full h-10 rounded-[10px] border border-input bg-card px-3 text-sm cursor-pointer"
              >
                <option value="pending">Noch nicht übergeben (Ausstehend)</option>
                <option value="shipped">Übergeben / versendet</option>
              </select>
            </label>
          </div>

          <div className="border-t pt-4">
            <button
              type="button"
              onClick={() => setShowAddress((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {showAddress ? "▾" : "▸"} Versand-Adresse (optional)
            </button>
            {showAddress && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="text-xs font-medium block col-span-2">
                  Straße & Hausnummer
                  <Input
                    value={shippingLine1}
                    onChange={(e) => setShippingLine1(e.target.value)}
                    className="mt-1"
                  />
                </label>
                <label className="text-xs font-medium block col-span-2">
                  Adresszusatz
                  <Input
                    value={shippingLine2}
                    onChange={(e) => setShippingLine2(e.target.value)}
                    className="mt-1"
                  />
                </label>
                <label className="text-xs font-medium block">
                  PLZ
                  <Input
                    value={shippingPostalCode}
                    onChange={(e) => setShippingPostalCode(e.target.value)}
                    className="mt-1"
                  />
                </label>
                <label className="text-xs font-medium block">
                  Ort
                  <Input
                    value={shippingCity}
                    onChange={(e) => setShippingCity(e.target.value)}
                    className="mt-1"
                  />
                </label>
                <label className="text-xs font-medium block col-span-2">
                  Land
                  <Input
                    value={shippingCountry}
                    onChange={(e) => setShippingCountry(e.target.value)}
                    placeholder="DE"
                    className="mt-1"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <label className="text-xs font-medium flex items-center gap-2">
              <input
                type="checkbox"
                checked={sendConfirmationEmail}
                onChange={(e) => setSendConfirmationEmail(e.target.checked)}
                disabled={!email.trim()}
              />
              Bestätigungs-Mail senden
              {!email.trim() && (
                <span className="text-muted-foreground">(benötigt E-Mail)</span>
              )}
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Anlegen..." : "Bestellung anlegen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
