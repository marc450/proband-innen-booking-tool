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
import { Search } from "lucide-react";
import { AlertDialog } from "@/components/confirm-dialog";
import type { MerchOrder, MerchOrderStatus } from "@/lib/types";

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

export function OrdersManager({ initialOrders }: { initialOrders: MerchOrder[] }) {
  const supabase = createClient();
  const [orders, setOrders] = useState(initialOrders);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | MerchOrderStatus>("");
  const [alertState, setAlertState] = useState<{ title: string; description: string } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (filterStatus && o.status !== filterStatus) return false;
      if (!q) return true;
      const name = [o.first_name, o.last_name].filter(Boolean).join(" ").toLowerCase();
      return (
        name.includes(q) ||
        (o.email || "").toLowerCase().includes(q) ||
        (o.product_title || "").toLowerCase().includes(q) ||
        (o.variant_color || "").toLowerCase().includes(q)
      );
    });
  }, [orders, search, filterStatus]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, o) => {
        if (o.status !== "cancelled" && o.status !== "refunded") acc.revenue += o.amount_paid_cents;
        acc.count += 1;
        return acc;
      },
      { revenue: 0, count: 0 },
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

      <div>
        <h1 className="text-2xl font-bold">Merch-Bestellungen</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {totals.count} {totals.count === 1 ? "Bestellung" : "Bestellungen"} · Umsatz{" "}
          {(totals.revenue / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, E-Mail, Produkt suchen..."
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
      </div>

      <div className="overflow-hidden rounded-[10px] ring-1 ring-black/5 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Datum</TableHead>
              <TableHead>Kund:in</TableHead>
              <TableHead>Produkt</TableHead>
              <TableHead>Variante</TableHead>
              <TableHead>Ärzt:in</TableHead>
              <TableHead>Versandadresse</TableHead>
              <TableHead className="text-right">Betrag</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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
                      {o.is_doctor ? (
                        <Badge variant="outline" className="text-sky-700 border-sky-300 bg-sky-50">Ja</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Nein</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[240px]">
                      {address || "–"}
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
    </div>
  );
}
