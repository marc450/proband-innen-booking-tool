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
import { AlertDialog } from "@/components/confirm-dialog";
import { Plus, Trash2, Copy, Check, ExternalLink, FileText } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

type AuszubildendePick = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  title: string | null;
};

interface Invoice {
  id: string;
  number: string | null;
  status: string;
  amount_due: number;
  amount_paid: number;
  currency: string;
  created: number;
  due_date: number | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  customer_name: string | null;
  customer_email: string | null;
}

interface LineItem {
  description: string;
  amount: string;
}

interface Props {
  initialAuszubildende: AuszubildendePick[];
}

const emptyLine = (): LineItem => ({ description: "", amount: "" });

export function RechnungenManager({ initialAuszubildende }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alertState, setAlertState] = useState<{ title: string; description: string } | null>(null);
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [existingId, setExistingId] = useState<string>("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressPostalCode, setAddressPostalCode] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressCountry, setAddressCountry] = useState("DE");
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLine()]);
  const [daysUntilDue, setDaysUntilDue] = useState("14");
  const [createError, setCreateError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/invoices");
    if (res.ok) {
      setInvoices(await res.json());
    } else {
      const data = await res.json();
      setAlertState({ title: "Fehler", description: data.error || "Rechnungen konnten nicht geladen werden." });
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setMode("existing");
    setExistingId("");
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setAddressLine1("");
    setAddressPostalCode("");
    setAddressCity("");
    setAddressCountry("DE");
    setLineItems([emptyLine()]);
    setDaysUntilDue("14");
    setCreateError(null);
    setCreatedInvoice(null);
    setCopied(false);
  };

  const handleExistingSelect = (id: string) => {
    setExistingId(id);
    const a = initialAuszubildende.find((x) => x.id === id);
    if (a) {
      setFirstName(a.first_name || "");
      setLastName(a.last_name || "");
      setEmail(a.email);
      setPhone(a.phone || "");
    }
  };

  const addLine = () => setLineItems((prev) => [...prev, emptyLine()]);
  const removeLine = (idx: number) =>
    setLineItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  const updateLine = (idx: number, patch: Partial<LineItem>) =>
    setLineItems((prev) => prev.map((li, i) => (i === idx ? { ...li, ...patch } : li)));

  const totalAmount = lineItems.reduce((sum, li) => sum + (Number(li.amount) || 0), 0);

  const handleCreate = async () => {
    setCreateError(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setCreateError("Vorname, Nachname und E-Mail sind erforderlich.");
      return;
    }
    const parsedLines = lineItems.map((li) => ({
      description: li.description.trim(),
      amount: Number(li.amount),
    }));
    for (const li of parsedLines) {
      if (!li.description) {
        setCreateError("Jede Position braucht eine Beschreibung.");
        return;
      }
      if (!Number.isFinite(li.amount) || li.amount <= 0) {
        setCreateError("Jede Position braucht einen positiven Betrag.");
        return;
      }
    }

    setSaving(true);
    const res = await fetch("/api/admin/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        addressLine1: addressLine1 || undefined,
        addressPostalCode: addressPostalCode || undefined,
        addressCity: addressCity || undefined,
        addressCountry: addressCountry || undefined,
        auszubildendeId: mode === "existing" && existingId ? existingId : undefined,
        lineItems: parsedLines,
        daysUntilDue: Number(daysUntilDue) || 14,
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setCreateError(data.error || "Fehler beim Erstellen.");
      return;
    }

    setCreatedInvoice(data);
    await load();
  };

  const handleCopyLink = () => {
    if (!createdInvoice?.hosted_invoice_url) return;
    navigator.clipboard.writeText(createdInvoice.hosted_invoice_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatAmount = (cents: number, currency: string) =>
    new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);

  const statusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-600 hover:bg-green-600">Bezahlt</Badge>;
      case "open":
        return <Badge variant="secondary">Offen</Badge>;
      case "draft":
        return <Badge variant="outline">Entwurf</Badge>;
      case "uncollectible":
        return <Badge variant="destructive">Uneinbringlich</Badge>;
      case "void":
        return <Badge variant="outline">Storniert</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
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
        <DialogContent size="wide" className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {createdInvoice ? "Rechnung erstellt" : "Neue Rechnung erstellen"}
            </DialogTitle>
          </DialogHeader>

          {createdInvoice ? (
            <>
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">
                  Die Rechnung wurde in Stripe erstellt, aber nicht automatisch per E-Mail versendet.
                  Teile den folgenden Link mit dem:der Auszubildenden zum Bezahlen.
                </p>
                <div className="rounded-lg bg-muted px-4 py-3 space-y-2">
                  <div>
                    <span className="text-muted-foreground text-xs uppercase tracking-wide">
                      Rechnungsnummer
                    </span>
                    <p className="font-mono font-medium">{createdInvoice.number || createdInvoice.id}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs uppercase tracking-wide">
                      Betrag
                    </span>
                    <p className="font-medium">
                      {formatAmount(createdInvoice.amount_due, createdInvoice.currency || "eur")}
                    </p>
                  </div>
                  {createdInvoice.hosted_invoice_url && (
                    <div>
                      <span className="text-muted-foreground text-xs uppercase tracking-wide">
                        Zahlungslink
                      </span>
                      <p className="text-xs break-all font-mono">{createdInvoice.hosted_invoice_url}</p>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter className="gap-2">
                {createdInvoice.hosted_invoice_url && (
                  <Button variant="outline" onClick={handleCopyLink} className="gap-1.5">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Kopiert" : "Link kopieren"}
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setShowCreate(false);
                    resetForm();
                  }}
                >
                  Fertig
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-4 py-2">
                {/* Customer selection */}
                <div className="space-y-2">
                  <Label>Kund:in</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={mode === "existing" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMode("existing")}
                    >
                      Bestehende:r Auszubildende:r
                    </Button>
                    <Button
                      type="button"
                      variant={mode === "new" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setMode("new");
                        setExistingId("");
                        setFirstName("");
                        setLastName("");
                        setEmail("");
                        setPhone("");
                      }}
                    >
                      Neu eingeben
                    </Button>
                  </div>
                </div>

                {mode === "existing" && (
                  <div className="space-y-1.5">
                    <Label>Auszubildende:r auswählen</Label>
                    <Select value={existingId} onValueChange={(v) => handleExistingSelect(v ?? "")}>
                      <SelectTrigger>
                        <span>
                          {existingId
                            ? (() => {
                                const a = initialAuszubildende.find((x) => x.id === existingId);
                                return a
                                  ? `${a.first_name || ""} ${a.last_name || ""} (${a.email})`.trim()
                                  : "Auswählen...";
                              })()
                            : "Auswählen..."}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {initialAuszubildende.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {[a.title, a.first_name, a.last_name].filter(Boolean).join(" ")} — {a.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Vorname *</Label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nachname *</Label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>E-Mail *</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Telefon</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Adresse (optional)</Label>
                  <Input
                    placeholder="Straße und Hausnummer"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="PLZ"
                      value={addressPostalCode}
                      onChange={(e) => setAddressPostalCode(e.target.value)}
                    />
                    <Input
                      placeholder="Stadt"
                      value={addressCity}
                      onChange={(e) => setAddressCity(e.target.value)}
                      className="col-span-2"
                    />
                  </div>
                </div>

                {/* Line items */}
                <div className="space-y-2">
                  <Label>Rechnungspositionen *</Label>
                  <div className="space-y-2">
                    {lineItems.map((li, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          placeholder="Beschreibung"
                          value={li.description}
                          onChange={(e) => updateLine(idx, { description: e.target.value })}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Betrag €"
                          value={li.amount}
                          onChange={(e) => updateLine(idx, { amount: e.target.value })}
                          className="w-32"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(idx)}
                          disabled={lineItems.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <Button type="button" variant="outline" size="sm" onClick={addLine}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Position hinzufügen
                    </Button>
                    <span className="text-sm font-medium">
                      Summe:{" "}
                      {new Intl.NumberFormat("de-DE", {
                        style: "currency",
                        currency: "EUR",
                      }).format(totalAmount)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Beträge inkl. MwSt. Es wird keine Steuer automatisch berechnet.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>Zahlungsziel (Tage)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={daysUntilDue}
                    onChange={(e) => setDaysUntilDue(e.target.value)}
                    className="w-32"
                  />
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
                  {saving ? "Wird erstellt..." : "Rechnung erstellen"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-end">
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Neue Rechnung
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Lade Rechnungen...</div>
          ) : invoices.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Noch keine Rechnungen vorhanden.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nummer</TableHead>
                  <TableHead>Kund:in</TableHead>
                  <TableHead>Betrag</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fällig</TableHead>
                  <TableHead>Erstellt</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm">{inv.number || inv.id.slice(0, 10)}</TableCell>
                    <TableCell>
                      <div className="text-sm">{inv.customer_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{inv.customer_email}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatAmount(inv.amount_due, inv.currency)}
                    </TableCell>
                    <TableCell>{statusBadge(inv.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {inv.due_date
                        ? format(new Date(inv.due_date * 1000), "dd.MM.yyyy", { locale: de })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(inv.created * 1000), "dd.MM.yyyy", { locale: de })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {inv.hosted_invoice_url && (
                          <a
                            href={inv.hosted_invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Zahlungslink öffnen"
                          >
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                        {inv.invoice_pdf && (
                          <a
                            href={inv.invoice_pdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="PDF öffnen"
                          >
                            <Button variant="ghost" size="sm">
                              <FileText className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                      </div>
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
