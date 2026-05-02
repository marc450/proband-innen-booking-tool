"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmailHistory } from "@/components/email-history";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Pencil, FileText, AlertTriangle, Ban, CheckCircle2, Mail, GitMerge, Copy, Check } from "lucide-react";
import { buildProfileCompletionUrl } from "@/lib/profile-link";
import { EmailManagerModal } from "@/components/email-manager-modal";
import { MergeContactModal } from "@/components/merge-contact-modal";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatPersonName } from "@/lib/utils";
import { MEDICAL_SPECIALTIES } from "@/lib/medical-specialties";
import type { Auszubildende, CourseBookingStatus } from "@/lib/types";

interface BookingRow {
  id: string;
  course_type: string;
  amount_paid: number | null;
  status: CourseBookingStatus;
  created_at: string;
  stripe_invoice_pdf_url: string | null;
  email: string | null;
  profile_complete: boolean | null;
  course_sessions: { date_iso: string; label_de: string | null; instructor_name: string | null } | null;
  course_templates: { title: string; course_label_de: string | null } | null;
}

// Imported historical purchases — live in legacy_bookings, distinct
// from the live course_bookings table. Includes both HubSpot deals
// (German marketing names, EUR amounts, course dates for Praxis) and
// LW user-export rows (slug-form course names, no amount, signup as
// purchased_at). The `source` column tells them apart.
interface LegacyBookingRow {
  id: string;
  product_name: string;
  amount_eur: number | null;
  course_date: string | null;
  purchased_at: string | null;
  source: string;
  created_at: string;
}

interface Props {
  azubi: Auszubildende;
  bookings: BookingRow[];
  legacyBookings: LegacyBookingRow[];
  isAdmin?: boolean;
}

const statusLabels: Record<CourseBookingStatus, string> = {
  booked: "Gebucht",
  completed: "Abgeschlossen",
  cancelled: "Storniert",
  refunded: "Erstattet",
};

const statusVariants: Record<CourseBookingStatus, "default" | "secondary" | "destructive"> = {
  booked: "default",
  completed: "secondary",
  cancelled: "destructive",
  refunded: "destructive",
};

const fieldClass = "bg-transparent border-0 p-0 text-sm text-foreground focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50 w-full";

export function AuszubildendeDetail({ azubi: initialAzubi, bookings, legacyBookings, isAdmin = true }: Props) {
  const supabase = createClient();
  const [azubi, setAzubi] = useState(initialAzubi);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(azubi.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  // Inline error surfaced below the email input. Cleared on successful
  // save or when the user starts typing again. Kept local (no toast
  // system in this app) so the rest of the page stays untouched.
  const [emailError, setEmailError] = useState<string | null>(null);
  // Tracks whether the profile-completion link was just copied so we can
  // flip the Copy icon to a Check for ~2s as user feedback (no toast
  // system in this app).
  const [profileLinkCopied, setProfileLinkCopied] = useState(false);

  // Pick the most recent booking that's still missing a completed
  // profile. Bookings are loaded sorted by created_at desc on the
  // server, so the head of the array is the freshest. The link works
  // identically for any of the contact's bookings — they all surface
  // the same completion form, scoped by booking_id + email.
  const incompleteBooking = bookings.find(
    (b) => b.profile_complete === false && b.email,
  );

  const handleCopyProfileLink = async () => {
    if (!incompleteBooking?.email) return;
    const url = buildProfileCompletionUrl(
      incompleteBooking.id,
      incompleteBooking.email,
    );
    try {
      await navigator.clipboard.writeText(url);
      setProfileLinkCopied(true);
      setTimeout(() => setProfileLinkCopied(false), 2000);
    } catch {
      // Clipboard API failed (rare — disabled by browser policy or no
      // secure context). Fall back to a textarea-select trick so the
      // staff member always gets the URL onto the clipboard.
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setProfileLinkCopied(true);
        setTimeout(() => setProfileLinkCopied(false), 2000);
      } finally {
        ta.remove();
      }
    }
  };

  // Name edit popover. Each input is independent (defaultValue + onBlur)
  // so editing Nachname commits via autosave on blur, identical to the
  // patient detail page. Outside-click closes the popover but doesn't
  // need to flush state — the blur on the focused input does that.
  const [namePopoverOpen, setNamePopoverOpen] = useState(false);
  const namePopoverRef = useRef<HTMLDivElement>(null);

  // Status dropdown
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Multi-email manager modal
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  // Merge-with-another-contact modal
  const [mergeModalOpen, setMergeModalOpen] = useState(false);

  const router = useRouter();

  const personName = [azubi.first_name, azubi.last_name].filter(Boolean).join(" ");
  const isCompany = azubi.contact_type === "company";
  const displayName = isCompany
    ? azubi.company_name || "Firma"
    : personName || azubi.company_name || "Unbekannt";

  // Force any focused input inside the popover to blur synchronously
  // BEFORE we unmount it. Without this, React's synthetic `onBlur` is
  // dropped when the input unmounts in the same tick as the close, and
  // any pending autosave (e.g. a freshly typed Titel) is lost.
  const flushNamePopoverFocus = () => {
    const el = document.activeElement;
    if (
      el instanceof HTMLElement &&
      namePopoverRef.current?.contains(el)
    ) {
      el.blur();
    }
  };

  // Close popovers on outside click. Per-input onBlur handles the save,
  // so this just hides the popover (after flushing any focused input).
  useEffect(() => {
    if (!namePopoverOpen && !statusDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (namePopoverOpen && namePopoverRef.current && !namePopoverRef.current.contains(e.target as Node)) {
        flushNamePopoverFocus();
        setNamePopoverOpen(false);
      }
      if (statusDropdownOpen && statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [namePopoverOpen, statusDropdownOpen]);

  const autosave = async (field: string, value: string) => {
    const trimmed = value.trim() || null;
    if (trimmed === (azubi[field as keyof typeof azubi] ?? null)) return;
    const { error } = await supabase
      .from("auszubildende")
      .update({ [field]: trimmed })
      .eq("id", azubi.id);
    if (!error) {
      setAzubi((prev) => ({ ...prev, [field]: trimmed }));
    }
  };

  // Email edits are special: the value is used as the contact key in
  // multiple places (email history Gmail query, future cert/reminder
  // sends, deduplication on import). Past course_bookings rows stay
  // pinned to whatever email they were booked with — only the
  // auszubildende.email column is mutated here.
  const saveEmail = async (raw: string, input?: HTMLInputElement | null) => {
    const trimmed = raw.trim().toLowerCase();
    const current = (azubi.email || "").toLowerCase();
    if (trimmed === current) {
      setEmailError(null);
      return;
    }
    if (!trimmed) {
      if (input) input.value = azubi.email || "";
      setEmailError("E-Mail darf nicht leer sein.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      if (input) input.value = azubi.email || "";
      setEmailError("Ungültiges E-Mail-Format.");
      return;
    }
    const { error } = await supabase
      .from("auszubildende")
      .update({ email: trimmed })
      .eq("id", azubi.id);
    if (error) {
      if (input) input.value = azubi.email || "";
      setEmailError(
        error.code === "23505"
          ? "Diese E-Mail ist bereits einer anderen Person zugeordnet."
          : `Speichern fehlgeschlagen: ${error.message}`,
      );
      return;
    }
    setAzubi((prev) => ({ ...prev, email: trimmed }));
    setEmailError(null);
  };

  const handleStatusChange = async (status: string) => {
    const { error } = await supabase
      .from("auszubildende")
      .update({ status })
      .eq("id", azubi.id);
    if (!error) {
      setAzubi((prev) => ({ ...prev, status }));
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    const { error } = await supabase
      .from("auszubildende")
      .update({ notes })
      .eq("id", azubi.id);
    if (!error) {
      setAzubi((prev) => ({ ...prev, notes }));
      setEditingNotes(false);
    }
    setSavingNotes(false);
  };

  const formatAmount = (cents: number | null) => {
    if (!cents) return "–";
    return `€${(cents / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })}`;
  };

  // legacy_bookings.amount_eur is stored as numeric(10,2) in EUR (not
  // cents — the HubSpot export was already in EUR), so it bypasses the
  // /100 step that the live-bookings formatter does.
  const formatLegacyEur = (eur: number | null) => {
    if (eur === null || eur === undefined) return "–";
    return `€${Number(eur).toLocaleString("de-DE", { minimumFractionDigits: 2 })}`;
  };

  // Map the import source into a human-readable badge label. Imports
  // tagged with a date suffix (lw_export_2026_05_02, hubspot_deals_…)
  // collapse to "LearnWorlds" / "HubSpot" so the badge stays short.
  const sourceLabel = (source: string) => {
    if (source.startsWith("lw_export")) return "LearnWorlds";
    if (source.startsWith("hubspot_deals")) return "HubSpot";
    return source;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const totalBookings = bookings.length;
  const totalRevenue = bookings.reduce((s, b) => s + (b.amount_paid || 0), 0);
  const courseTypeCounts: Record<string, number> = {};
  for (const b of bookings) {
    courseTypeCounts[b.course_type] = (courseTypeCounts[b.course_type] || 0) + 1;
  }

  return (
    <div className="space-y-4">
      {/* Back link + actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/auszubildende/personen"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Alle Ärzt:innen
        </Link>
        {isAdmin && (
          <button
            onClick={() => setMergeModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            title="Mit anderem Kontakt zusammenführen"
          >
            <GitMerge className="h-3.5 w-3.5" />
            Profile zusammenführen
          </button>
        )}
      </div>

      {/* 3-column HubSpot-style layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_320px] gap-5">

        {/* ===== LEFT: Contact info ===== */}
        <div className="space-y-5">
          {/* Name + Status card */}
          <Card className="overflow-visible">
            <CardContent className="pt-5 pb-4">
              <div className="relative">
                <div className="flex items-center gap-1.5 group">
                  <h1 className="text-xl font-semibold break-words min-w-0">
                    {formatPersonName({ title: azubi.title, firstName: azubi.first_name, lastName: azubi.last_name }) || "Unbekannt"}
                  </h1>
                  <button
                    onClick={() => {
                      if (namePopoverOpen) flushNamePopoverFocus();
                      setNamePopoverOpen((v) => !v);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted shrink-0"
                    title="Name bearbeiten"
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
                {namePopoverOpen && (
                  <div
                    ref={namePopoverRef}
                    className="absolute top-full left-0 mt-2 bg-popover border rounded-lg shadow-lg p-4 space-y-3 z-20 w-[280px]"
                  >
                    {/* Reference: show the email so names can be derived
                        from it without having to close the popover. */}
                    <div className="text-[11px] text-muted-foreground break-all bg-muted/50 rounded px-2 py-1.5">
                      <span className="uppercase tracking-wider font-medium">E-Mail</span>
                      <div className="text-foreground break-all">{azubi.email}</div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Titel</label>
                      <input
                        defaultValue={azubi.title || ""}
                        onBlur={(e) => autosave("title", e.target.value)}
                        placeholder="z.B. Dr."
                        className="w-full mt-1 border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Vorname</label>
                      <input
                        defaultValue={azubi.first_name || ""}
                        onBlur={(e) => autosave("first_name", e.target.value)}
                        autoFocus
                        className="w-full mt-1 border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Nachname</label>
                      <input
                        defaultValue={azubi.last_name || ""}
                        onBlur={(e) => autosave("last_name", e.target.value)}
                        className="w-full mt-1 border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-2 relative" ref={statusDropdownRef}>
                <button
                  onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 cursor-pointer ${
                    azubi.status === "active"
                      ? "bg-emerald-100 text-emerald-700"
                      : azubi.status === "warning"
                      ? "bg-amber-100 text-amber-700"
                      : azubi.status === "blacklist"
                      ? "bg-red-100 text-red-700"
                      : azubi.status === "inactive"
                      ? "bg-gray-200 text-gray-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {azubi.status === "active" && <CheckCircle2 className="h-3 w-3" />}
                  {azubi.status === "warning" && <AlertTriangle className="h-3 w-3" />}
                  {azubi.status === "blacklist" && <Ban className="h-3 w-3" />}
                  {azubi.status === "inactive" && <Ban className="h-3 w-3" />}
                  {azubi.status === "active"
                    ? "Aktiv"
                    : azubi.status === "warning"
                    ? "Warnung"
                    : azubi.status === "blacklist"
                    ? "Blacklist"
                    : "Inaktiv"}
                </button>
                {statusDropdownOpen && (
                  <div className="absolute z-50 mt-1 left-0 bg-popover border rounded-md shadow-md py-1 min-w-[180px]">
                    {(["active", "warning", "blacklist", "inactive"] as const).map((s) => (
                      <button
                        key={s}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-muted text-left"
                        onClick={() => { handleStatusChange(s); setStatusDropdownOpen(false); }}
                      >
                        {s === "active" && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                        {s === "warning" && <AlertTriangle className="h-3 w-3 text-amber-600" />}
                        {s === "blacklist" && <Ban className="h-3 w-3 text-red-600" />}
                        {s === "inactive" && <Ban className="h-3 w-3 text-gray-600" />}
                        {s === "active"
                          ? "Aktiv"
                          : s === "warning"
                          ? "Warnung"
                          : s === "blacklist"
                          ? "Blacklist"
                          : "Inaktiv (keine E-Mails)"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Profile-completion link copy. Surfaces only when at
                  least one booking still needs the contact to fill in
                  title / specialty / EFN / birthdate. The link drops
                  the contact onto the same /courses/success screen the
                  reminder email points at. */}
              {incompleteBooking && (
                <button
                  type="button"
                  onClick={handleCopyProfileLink}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium rounded-[10px] px-2.5 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors w-full justify-center"
                  title="Profil-Vervollständigungs-Link in die Zwischenablage kopieren"
                >
                  {profileLinkCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Link kopiert
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Profil-Link kopieren
                    </>
                  )}
                </button>
              )}
            </CardContent>
          </Card>

          {/* Kontakt */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Kontakt</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-2 items-center">
                <span className="text-xs text-muted-foreground">Geschlecht</span>
                <input defaultValue={azubi.gender || ""} placeholder="–" onBlur={(e) => autosave("gender", e.target.value)} className={fieldClass} />

                <span className="text-xs text-muted-foreground">E-Mail</span>
                <button
                  type="button"
                  onClick={() => setEmailModalOpen(true)}
                  className="min-w-0 text-left flex items-center gap-1.5 group hover:text-primary transition-colors"
                  title="E-Mail-Adressen verwalten"
                >
                  <span className="text-sm text-primary truncate">
                    {azubi.email || "–"}
                  </span>
                  <Mail className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </button>

                <span className="text-xs text-muted-foreground">Telefon</span>
                <input defaultValue={azubi.phone || ""} placeholder="–" onBlur={(e) => autosave("phone", e.target.value)} className={fieldClass} />

                <span className="text-xs text-muted-foreground">Geburtstag</span>
                <input type="date" defaultValue={azubi.birthdate || ""} onBlur={(e) => autosave("birthdate", e.target.value)} className={`${fieldClass} w-fit`} />
              </div>
            </CardContent>
          </Card>

          {/* Professional */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Beruflich</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-2 items-center">
                <span className="text-xs text-muted-foreground">Fachrichtung</span>
                <select
                  value={azubi.specialty || ""}
                  onChange={(e) => autosave("specialty", e.target.value)}
                  className={`${fieldClass} cursor-pointer`}
                >
                  <option value="">–</option>
                  {/* If the stored specialty isn't on the canonical list,
                      surface it as an extra option so we never lose the
                      existing value on first edit. */}
                  {azubi.specialty && !MEDICAL_SPECIALTIES.includes(
                    azubi.specialty as typeof MEDICAL_SPECIALTIES[number]
                  ) && (
                    <option value={azubi.specialty}>{azubi.specialty}</option>
                  )}
                  {MEDICAL_SPECIALTIES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <span className="text-xs text-muted-foreground">EFN</span>
                <input defaultValue={azubi.efn || ""} placeholder="–" onBlur={(e) => autosave("efn", e.target.value)} className={`${fieldClass} font-mono`} />

                <span className="text-xs text-muted-foreground">Praxis</span>
                <input defaultValue={azubi.company_name || ""} placeholder="–" onBlur={(e) => autosave("company_name", e.target.value)} className={fieldClass} />

                <span className="text-xs text-muted-foreground">USt.-IdNr.</span>
                <input defaultValue={azubi.vat_id || ""} placeholder="–" onBlur={(e) => autosave("vat_id", e.target.value)} className={`${fieldClass} font-mono`} />
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Adresse</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-2 items-center">
                <span className="text-xs text-muted-foreground">Straße</span>
                <input defaultValue={azubi.address_line1 || ""} placeholder="–" onBlur={(e) => autosave("address_line1", e.target.value)} className={fieldClass} />

                <span className="text-xs text-muted-foreground">PLZ</span>
                <input defaultValue={azubi.address_postal_code || ""} placeholder="–" onBlur={(e) => autosave("address_postal_code", e.target.value)} className={fieldClass} />

                <span className="text-xs text-muted-foreground">Stadt</span>
                <input defaultValue={azubi.address_city || ""} placeholder="–" onBlur={(e) => autosave("address_city", e.target.value)} className={fieldClass} />

                <span className="text-xs text-muted-foreground">Land</span>
                <input defaultValue={azubi.address_country || ""} placeholder="DE" onBlur={(e) => autosave("address_country", e.target.value)} className={fieldClass} />
              </div>
            </CardContent>
          </Card>

          <div className="text-xs text-muted-foreground px-1">
            Erstellt am {formatDateTime(azubi.created_at)}
          </div>
        </div>

        {/* ===== CENTER: Notes + Emails ===== */}
        <div className="space-y-5">
          {/* Notes */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notizen</CardTitle>
                {!editingNotes && (
                  <button
                    onClick={() => { setNotes(azubi.notes || ""); setEditingNotes(true); }}
                    className="p-1 rounded hover:bg-gray-100 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingNotes ? (
                <div className="space-y-3">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[100px]"
                    placeholder="Notizen hinzufügen..."
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveNotes} disabled={savingNotes}>
                      {savingNotes ? "Speichern..." : "Speichern"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingNotes(false)}>
                      Abbrechen
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {azubi.notes || "Keine Notizen vorhanden."}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Emails */}
          <EmailHistory
            email={azubi.email}
            displayName={personName || undefined}
            canCompose={isAdmin}
            aiMode="auszubildende"
          />
        </div>

        {/* ===== RIGHT: Stats + Buchungsverlauf ===== */}
        <div className="space-y-5">
          {/* Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Statistik</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Buchungen</span>
                <span className="text-sm font-semibold">{totalBookings}</span>
              </div>
              {isAdmin && totalRevenue > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm">Umsatz</span>
                  <span className="text-sm font-semibold">{formatAmount(totalRevenue)}</span>
                </div>
              )}
              {Object.entries(courseTypeCounts).sort().map(([type, count]) => (
                <div key={type} className="flex justify-between">
                  <span className="text-xs text-muted-foreground">{type}</span>
                  <span className="text-xs font-medium">{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Booking history */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Buchungsverlauf</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {bookings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6 px-4">
                  Noch keine Buchungen vorhanden.
                </p>
              ) : (
                <div className="divide-y">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="px-4 py-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">
                          {booking.course_templates?.course_label_de || booking.course_templates?.title || "–"}
                        </span>
                        <Badge variant={statusVariants[booking.status]} className="shrink-0 text-[10px]">
                          {statusLabels[booking.status]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{booking.course_type}</Badge>
                        <span>{booking.course_sessions?.label_de || booking.course_sessions?.date_iso || "–"}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Gebucht am {formatDate(booking.created_at)}</span>
                        <div className="flex items-center gap-2">
                          {isAdmin && <span>{formatAmount(booking.amount_paid)}</span>}
                          {isAdmin && booking.stripe_invoice_pdf_url && (
                            <a
                              href={booking.stripe_invoice_pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              title="Rechnung"
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Legacy bookings — historical data imported from HubSpot
              and LearnWorlds. Distinct from `bookings` above (live
              course_bookings table) because legacy purchases include
              products that aren't in our current offering anymore. */}
          {legacyBookings.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Historische Buchungen
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {legacyBookings.map((lb) => (
                    <div key={lb.id} className="px-4 py-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate" title={lb.product_name}>
                          {lb.product_name}
                        </span>
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          {sourceLabel(lb.source)}
                        </Badge>
                      </div>
                      {lb.course_date && (
                        <div className="text-xs text-muted-foreground">
                          Kursdatum: {formatDate(lb.course_date)}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {lb.purchased_at
                            ? `Gekauft am ${formatDate(lb.purchased_at)}`
                            : "–"}
                        </span>
                        {isAdmin && lb.amount_eur !== null && (
                          <span>{formatLegacyEur(lb.amount_eur)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <EmailManagerModal
        open={emailModalOpen}
        onOpenChange={setEmailModalOpen}
        source="auszubildende"
        contactId={azubi.id}
        onPrimaryChange={(newPrimary) => {
          setAzubi((prev) => ({ ...prev, email: newPrimary }));
        }}
      />

      <MergeContactModal
        open={mergeModalOpen}
        onOpenChange={setMergeModalOpen}
        source="auszubildende"
        primaryId={azubi.id}
        primaryLabel={
          formatPersonName({
            title: azubi.title,
            firstName: azubi.first_name,
            lastName: azubi.last_name,
          }) ||
          azubi.email ||
          "Dieser Kontakt"
        }
        onMerged={() => {
          // Reload from the server so the merged data + new
          // bookings/emails appear under this profile.
          router.refresh();
        }}
      />
    </div>
  );
}
