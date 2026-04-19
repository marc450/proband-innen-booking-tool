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
import { ArrowLeft, Pencil, FileText, AlertTriangle, Ban, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { formatPersonName } from "@/lib/utils";
import type { Auszubildende, CourseBookingStatus } from "@/lib/types";

interface BookingRow {
  id: string;
  course_type: string;
  amount_paid: number | null;
  status: CourseBookingStatus;
  created_at: string;
  stripe_invoice_pdf_url: string | null;
  course_sessions: { date_iso: string; label_de: string | null; instructor_name: string | null } | null;
  course_templates: { title: string; course_label_de: string | null } | null;
}

interface Props {
  azubi: Auszubildende;
  bookings: BookingRow[];
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

export function AuszubildendeDetail({ azubi: initialAzubi, bookings, isAdmin = true }: Props) {
  const supabase = createClient();
  const [azubi, setAzubi] = useState(initialAzubi);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(azubi.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);

  // Name edit popover
  const [namePopoverOpen, setNamePopoverOpen] = useState(false);
  const namePopoverRef = useRef<HTMLDivElement>(null);

  // Status dropdown
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  const personName = [azubi.first_name, azubi.last_name].filter(Boolean).join(" ");
  const isCompany = azubi.contact_type === "company";
  const displayName = isCompany
    ? azubi.company_name || "Firma"
    : personName || azubi.company_name || "Unbekannt";

  // Close popovers on outside click
  useEffect(() => {
    if (!namePopoverOpen && !statusDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (namePopoverOpen && namePopoverRef.current && !namePopoverRef.current.contains(e.target as Node)) {
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
      {/* Back link */}
      <Link
        href="/dashboard/auszubildende/personen"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Alle Ärzt:innen
      </Link>

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
                    onClick={() => setNamePopoverOpen(!namePopoverOpen)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted shrink-0"
                    title="Name bearbeiten"
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
                {namePopoverOpen && (
                  <div ref={namePopoverRef} className="absolute top-full left-0 mt-2 bg-popover border rounded-lg shadow-lg p-4 space-y-3 z-10 w-[240px]">
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
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {azubi.status === "active" && <CheckCircle2 className="h-3 w-3" />}
                  {azubi.status === "warning" && <AlertTriangle className="h-3 w-3" />}
                  {azubi.status === "blacklist" && <Ban className="h-3 w-3" />}
                  {azubi.status === "active" ? "Aktiv" : azubi.status === "warning" ? "Warnung" : "Blacklist"}
                </button>
                {statusDropdownOpen && (
                  <div className="absolute z-50 mt-1 left-0 bg-popover border rounded-md shadow-md py-1 min-w-[140px]">
                    {(["active", "warning", "blacklist"] as const).map((s) => (
                      <button
                        key={s}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-muted text-left"
                        onClick={() => { handleStatusChange(s); setStatusDropdownOpen(false); }}
                      >
                        {s === "active" && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                        {s === "warning" && <AlertTriangle className="h-3 w-3 text-amber-600" />}
                        {s === "blacklist" && <Ban className="h-3 w-3 text-red-600" />}
                        {s === "active" ? "Aktiv" : s === "warning" ? "Warnung" : "Blacklist"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
                <a href={`mailto:${azubi.email}`} className="text-primary hover:underline truncate text-sm">{azubi.email}</a>

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
                <input defaultValue={azubi.specialty || ""} placeholder="–" onBlur={(e) => autosave("specialty", e.target.value)} className={fieldClass} />

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
          <EmailHistory email={azubi.email} displayName={personName || undefined} canCompose={isAdmin} />
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
        </div>
      </div>
    </div>
  );
}
