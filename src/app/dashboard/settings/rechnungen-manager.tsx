"use client";

import { useEffect, useRef, useState } from "react";
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
import { AlertDialog, ConfirmDialog } from "@/components/confirm-dialog";
import {
  Plus,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  FileText,
  Ban,
  Search,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import Link from "next/link";

type AuszubildendePick = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  title: string | null;
};

type ContactType = "auszubildende" | "proband" | "other" | "company";
// The three real kinds a new contact can be. "company" only exists on
// legacy auszubildende rows and on patient search results (never) — we no
// longer let the admin pick it directly; instead "Ist eine Firma" toggles
// the company flag independently from the type.
type NewContactType = "auszubildende" | "proband" | "other";

type ContactSearchResult = {
  id: string;
  source: "auszubildende" | "patient";
  contactType: ContactType;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  companyName: string | null;
  vatId: string | null;
  addressLine1: string | null;
  addressPostalCode: string | null;
  addressCity: string | null;
  addressCountry: string | null;
  title: string | null;
};

// Shape returned by /api/admin/transactions — a unified ledger row for
// Stripe invoices (admin-created, no-show, other) AND standalone charges
// from the course-booking checkout flow. See that endpoint for the full
// classification rules.
type TransactionKind =
  | "invoice_manual"
  | "invoice_no_show"
  | "invoice_other"
  | "charge";

interface Transaction {
  id: string;
  kind: TransactionKind;
  created: number;
  amount: number;
  currency: string;
  status: string;
  customer_name: string | null;
  customer_email: string | null;
  description: string | null;
  invoice_number: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf_url: string | null;
  receipt_url: string | null;
  amount_refunded: number;
  auszubildende_id: string | null;
}

// Local type returned by the POST /api/admin/invoices create flow.
interface CreatedInvoice {
  id: string;
  number: string | null;
  status: string;
  amount_due: number;
  currency: string;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
}

interface LineItem {
  description: string;
  amount: string;
}

interface Props {
  // Kept for API compatibility with settings-content; no longer used directly
  // because contact selection now goes through the live search endpoint.
  initialAuszubildende?: AuszubildendePick[];
}

const emptyLine = (): LineItem => ({ description: "", amount: "" });

const contactTypeLabel = (t: ContactType): string => {
  switch (t) {
    case "auszubildende":
      return "Auszubildende:r";
    case "proband":
      return "Proband:in";
    case "company":
      return "Firma";
    case "other":
    default:
      return "Sonstige:r";
  }
};

const newTypeOptions: { value: NewContactType; label: string }[] = [
  { value: "auszubildende", label: "Auszubildende:r" },
  { value: "proband", label: "Proband:in" },
  { value: "other", label: "Sonstige:r" },
];

type FilterKey = "all" | "invoice" | "charge" | "no_show";

const filterOptions: { value: FilterKey; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "invoice", label: "Rechnungen" },
  { value: "charge", label: "Kurs-Buchungen" },
  { value: "no_show", label: "No-Shows" },
];

export function RechnungenManager(_props: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alertState, setAlertState] = useState<{ title: string; description: string } | null>(null);
  const [createdInvoice, setCreatedInvoice] = useState<CreatedInvoice | null>(null);
  const [copied, setCopied] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Transaction | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Form state — two top-level modes
  const [mode, setMode] = useState<"existing" | "new">("existing");

  // Existing-contact autocomplete
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ContactSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactSearchResult | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // New-contact type picker (defaults to auszubildende) + independent
  // company flag. Proband:innen are always private persons, so the flag
  // is locked off when proband is selected.
  const [newContactType, setNewContactType] = useState<NewContactType>("auszubildende");
  const [newIsCompany, setNewIsCompany] = useState(false);

  // Shared person/company fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [vatId, setVatId] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressPostalCode, setAddressPostalCode] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressCountry, setAddressCountry] = useState("DE");
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLine()]);
  const [daysUntilDue, setDaysUntilDue] = useState("14");
  const [createError, setCreateError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/transactions");
    if (res.ok) {
      setTransactions(await res.json());
    } else {
      const data = await res.json();
      setAlertState({
        title: "Fehler",
        description: data.error || "Transaktionen konnten nicht geladen werden.",
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setMode("existing");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedContact(null);
    setNewContactType("auszubildende");
    setNewIsCompany(false);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setCompanyName("");
    setVatId("");
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

  // Debounced live search against /api/admin/contact-search
  useEffect(() => {
    if (mode !== "existing") return;
    if (selectedContact) return;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/contact-search?q=${encodeURIComponent(q)}&limit=20`
        );
        if (res.ok) {
          const data = (await res.json()) as ContactSearchResult[];
          setSearchResults(data);
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery, mode, selectedContact]);

  const pickContact = (c: ContactSearchResult) => {
    setSelectedContact(c);
    setSearchResults([]);
    setSearchQuery("");
    setFirstName(c.firstName || "");
    setLastName(c.lastName || "");
    setEmail(c.email || "");
    setPhone(c.phone || "");
    setCompanyName(c.companyName || "");
    setVatId(c.vatId || "");
    setAddressLine1(c.addressLine1 || "");
    setAddressPostalCode(c.addressPostalCode || "");
    setAddressCity(c.addressCity || "");
    setAddressCountry(c.addressCountry || "DE");
  };

  const clearSelectedContact = () => {
    setSelectedContact(null);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setCompanyName("");
    setVatId("");
    setAddressLine1("");
    setAddressPostalCode("");
    setAddressCity("");
    setAddressCountry("DE");
  };

  const addLine = () => setLineItems((prev) => [...prev, emptyLine()]);
  const removeLine = (idx: number) =>
    setLineItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  const updateLine = (idx: number, patch: Partial<LineItem>) =>
    setLineItems((prev) => prev.map((li, i) => (i === idx ? { ...li, ...patch } : li)));

  const totalAmount = lineItems.reduce((sum, li) => sum + (Number(li.amount) || 0), 0);

  // Effective contact type + company flag for the payload.
  // - Existing contacts keep their own type. A contact is a "company" if
  //   either the legacy contact_type='company' is set, OR company_name is
  //   filled while first/last name are empty (the new convention).
  // - New contacts use the radio choice plus the independent company
  //   toggle. Proband:innen are locked to personal (never a company).
  const effectiveContactType: ContactType =
    mode === "existing" && selectedContact ? selectedContact.contactType : newContactType;
  const isCompany =
    mode === "existing" && selectedContact
      ? selectedContact.contactType === "company" ||
        (!!selectedContact.companyName &&
          !selectedContact.firstName &&
          !selectedContact.lastName)
      : newContactType !== "proband" && newIsCompany;

  const handleCreate = async () => {
    setCreateError(null);

    if (mode === "existing" && !selectedContact) {
      setCreateError("Bitte wähle eine bestehende Person oder Firma aus.");
      return;
    }
    if (!email.trim()) {
      setCreateError("E-Mail ist erforderlich.");
      return;
    }
    if (isCompany) {
      if (!companyName.trim()) {
        setCreateError("Firmenname ist erforderlich.");
        return;
      }
    } else {
      if (!firstName.trim() || !lastName.trim()) {
        setCreateError("Vorname und Nachname sind erforderlich.");
        return;
      }
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
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        email,
        phone: phone || undefined,
        companyName: companyName || undefined,
        vatId: vatId || undefined,
        addressLine1: addressLine1 || undefined,
        addressPostalCode: addressPostalCode || undefined,
        addressCity: addressCity || undefined,
        addressCountry: addressCountry || undefined,
        auszubildendeId:
          mode === "existing" && selectedContact?.source === "auszubildende"
            ? selectedContact.id
            : undefined,
        contactType: effectiveContactType,
        isCompany,
        createContact: mode === "new",
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

  const handleCancelInvoice = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    const res = await fetch(`/api/admin/invoices/${cancelTarget.id}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    setCancelling(false);
    if (!res.ok) {
      setAlertState({
        title: "Stornierung fehlgeschlagen",
        description: data.error || "Die Rechnung konnte nicht storniert werden.",
      });
      return;
    }
    setCancelTarget(null);
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
      case "succeeded":
        return <Badge className="bg-green-600 hover:bg-green-600">Bezahlt</Badge>;
      case "open":
        return <Badge variant="secondary">Offen</Badge>;
      case "draft":
        return <Badge variant="outline">Entwurf</Badge>;
      case "uncollectible":
        return <Badge variant="destructive">Uneinbringlich</Badge>;
      case "void":
        return <Badge variant="outline">Storniert</Badge>;
      case "refunded":
        return <Badge variant="destructive">Erstattet</Badge>;
      case "partially_refunded":
        return <Badge variant="destructive">Teilw. erstattet</Badge>;
      case "pending":
        return <Badge variant="secondary">Ausstehend</Badge>;
      case "failed":
        return <Badge variant="destructive">Fehlgeschlagen</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const kindBadge = (kind: TransactionKind) => {
    switch (kind) {
      case "invoice_manual":
        return <Badge variant="outline" className="text-xs">Rechnung</Badge>;
      case "invoice_no_show":
        return (
          <Badge variant="outline" className="text-xs border-amber-500 text-amber-700">
            No-Show
          </Badge>
        );
      case "charge":
        return (
          <Badge variant="outline" className="text-xs border-blue-500 text-blue-700">
            Kurs-Buchung
          </Badge>
        );
      case "invoice_other":
      default:
        return <Badge variant="outline" className="text-xs">Sonstige</Badge>;
    }
  };

  // Filter chips apply in-memory to the already-loaded transaction list.
  const filteredTransactions = transactions.filter((t) => {
    if (filter === "all") return true;
    if (filter === "invoice")
      return t.kind === "invoice_manual" || t.kind === "invoice_other";
    if (filter === "charge") return t.kind === "charge";
    if (filter === "no_show") return t.kind === "invoice_no_show";
    return true;
  });

  const canCancelTransaction = (t: Transaction) =>
    (t.kind === "invoice_manual" || t.kind === "invoice_no_show") &&
    (t.status === "open" || t.status === "draft" || t.status === "uncollectible");

  return (
    <div className="space-y-6">
      <AlertDialog
        open={!!alertState}
        title={alertState?.title ?? ""}
        description={alertState?.description ?? ""}
        onClose={() => setAlertState(null)}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        title="Rechnung stornieren?"
        description={
          cancelTarget
            ? `Rechnung ${cancelTarget.invoice_number || cancelTarget.id.slice(0, 10)} über ${formatAmount(
                cancelTarget.amount,
                cancelTarget.currency || "eur"
              )} wird storniert. Entwürfe werden komplett gelöscht, offene Rechnungen werden in Stripe als "void" markiert. Der Zahlungslink ist danach nicht mehr nutzbar.`
            : ""
        }
        confirmLabel={cancelling ? "Wird storniert..." : "Stornieren"}
        variant="destructive"
        onConfirm={handleCancelInvoice}
        onCancel={() => setCancelTarget(null)}
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
                  Teile den folgenden Link mit dem:der Empfänger:in zum Bezahlen.
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
                {/* Mode switch */}
                <div className="space-y-2">
                  <Label>Empfänger:in</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={mode === "existing" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setMode("existing");
                        clearSelectedContact();
                      }}
                    >
                      Bestehende Person/Firma
                    </Button>
                    <Button
                      type="button"
                      variant={mode === "new" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setMode("new");
                        clearSelectedContact();
                        setSearchQuery("");
                        setSearchResults([]);
                      }}
                    >
                      Neue Person/Firma
                    </Button>
                  </div>
                </div>

                {/* Existing: live autocomplete */}
                {mode === "existing" && !selectedContact && (
                  <div className="space-y-1.5 relative">
                    <Label>Suchen (Name, E-Mail, Firma)</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Mindestens 2 Zeichen..."
                        // inline style overrides the admin-scoped input CSS
                        // in globals.css which forces padding-left: 1rem and
                        // would otherwise swallow the search icon's space.
                        style={{ paddingLeft: "2.5rem" }}
                      />
                    </div>
                    {searchQuery.trim().length >= 2 && (
                      <div className="rounded-lg bg-background/80 shadow-sm mt-1 max-h-64 overflow-y-auto">
                        {searching ? (
                          <div className="p-3 text-sm text-muted-foreground">Suche...</div>
                        ) : searchResults.length === 0 ? (
                          <div className="p-3 text-sm text-muted-foreground">
                            Keine Treffer. Nutze "Neue Person/Firma".
                          </div>
                        ) : (
                          <ul className="divide-y divide-border/50">
                            {searchResults.map((c) => (
                              <li key={`${c.source}-${c.id}`}>
                                <button
                                  type="button"
                                  onClick={() => pickContact(c)}
                                  className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="text-sm font-medium truncate">
                                        {c.contactType === "company"
                                          ? c.companyName || "—"
                                          : [c.title, c.firstName, c.lastName]
                                              .filter(Boolean)
                                              .join(" ") || "—"}
                                      </div>
                                      <div className="text-xs text-muted-foreground truncate">
                                        {c.email}
                                        {c.companyName && c.contactType !== "company"
                                          ? ` · ${c.companyName}`
                                          : ""}
                                      </div>
                                    </div>
                                    <Badge variant="outline" className="shrink-0 text-xs">
                                      {contactTypeLabel(c.contactType)}
                                    </Badge>
                                  </div>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {mode === "existing" && selectedContact && (
                  <div className="rounded-lg bg-muted/60 px-3 py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {selectedContact.contactType === "company"
                            ? selectedContact.companyName || "—"
                            : [selectedContact.firstName, selectedContact.lastName]
                                .filter(Boolean)
                                .join(" ") || "—"}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {contactTypeLabel(selectedContact.contactType)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {selectedContact.email}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearSelectedContact}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* New: type picker + independent "Ist eine Firma" toggle.
                    Proband:innen can never be companies. */}
                {mode === "new" && (
                  <div className="space-y-2">
                    <Label>Typ</Label>
                    <div className="flex flex-wrap gap-2">
                      {newTypeOptions.map((t) => (
                        <Button
                          key={t.value}
                          type="button"
                          variant={newContactType === t.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setNewContactType(t.value);
                            if (t.value === "proband") setNewIsCompany(false);
                          }}
                        >
                          {t.label}
                        </Button>
                      ))}
                    </div>
                    {newContactType !== "proband" && (
                      <label className="inline-flex items-center gap-2 pt-1 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={newIsCompany}
                          onChange={(e) => setNewIsCompany(e.target.checked)}
                          className="h-4 w-4 rounded"
                        />
                        <span className="text-sm">Ist eine Firma/Praxis</span>
                      </label>
                    )}
                  </div>
                )}

                {/* Company name (company mode, or optional companyName for person) */}
                {isCompany ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Firmenname *</Label>
                      <Input
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        disabled={mode === "existing" && !!selectedContact}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>USt.-IdNr. (optional)</Label>
                      <Input
                        value={vatId}
                        onChange={(e) => setVatId(e.target.value)}
                        placeholder="z.B. DE123456789"
                        disabled={mode === "existing" && !!selectedContact}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Vorname *</Label>
                        <Input
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          disabled={mode === "existing" && !!selectedContact}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Nachname *</Label>
                        <Input
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          disabled={mode === "existing" && !!selectedContact}
                        />
                      </div>
                    </div>
                    {/* Firma field only when the checkbox is on. For the
                        existing-contact case we still show it so a company
                        name stored on the contact stays visible. */}
                    {(mode === "existing" && selectedContact?.companyName) && (
                      <div className="space-y-1.5">
                        <Label>Firma</Label>
                        <Input value={companyName} disabled />
                      </div>
                    )}
                  </>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>E-Mail *</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={mode === "existing" && !!selectedContact}
                    />
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

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {filterOptions.map((f) => (
            <Button
              key={f.value}
              type="button"
              variant={filter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Neue Rechnung
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Lade Transaktionen...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              {transactions.length === 0
                ? "Noch keine Transaktionen vorhanden."
                : "Keine Treffer für diesen Filter."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Typ</TableHead>
                  <TableHead>Kund:in</TableHead>
                  <TableHead>Betrag</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Dokumente</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((t) => {
                  const customerNode = (
                    <>
                      <div className="text-sm">{t.customer_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{t.customer_email || ""}</div>
                      {t.invoice_number && (
                        <div className="text-xs text-muted-foreground font-mono">
                          {t.invoice_number}
                        </div>
                      )}
                    </>
                  );
                  return (
                    <TableRow key={t.id}>
                      <TableCell>{kindBadge(t.kind)}</TableCell>
                      <TableCell>
                        {t.auszubildende_id ? (
                          <Link
                            href={`/dashboard/auszubildende/personen/${t.auszubildende_id}`}
                            className="block hover:underline"
                          >
                            {customerNode}
                          </Link>
                        ) : (
                          customerNode
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatAmount(t.amount, t.currency)}
                        {t.amount_refunded > 0 && (
                          <div className="text-xs text-muted-foreground">
                            - {formatAmount(t.amount_refunded, t.currency)} erstattet
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{statusBadge(t.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(t.created * 1000), "dd.MM.yyyy", { locale: de })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {t.invoice_pdf_url && (
                            <a
                              href={t.invoice_pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="PDF öffnen"
                            >
                              <Button variant="ghost" size="sm">
                                <FileText className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                          {t.hosted_invoice_url && (
                            <a
                              href={t.hosted_invoice_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Zahlungslink öffnen"
                            >
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                          {t.receipt_url && (
                            <a
                              href={t.receipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Beleg öffnen"
                            >
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {canCancelTransaction(t) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCancelTarget(t)}
                            title="Rechnung stornieren"
                            className="text-destructive hover:text-destructive"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
