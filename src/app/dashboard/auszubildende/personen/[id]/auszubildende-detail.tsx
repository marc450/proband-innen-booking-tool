"use client";

import { useState } from "react";
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
import { ArrowLeft, Pencil, FileText } from "lucide-react";
import Link from "next/link";
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
  // Nutzer:innen see the profile but no revenue columns and can't send
  // emails from here. Default true keeps admin-only call sites working.
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

export function AuszubildendeDetail({ azubi: initialAzubi, bookings, isAdmin = true }: Props) {
  const supabase = createClient();
  const [azubi, setAzubi] = useState(initialAzubi);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(azubi.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);

  const personName = [azubi.first_name, azubi.last_name].filter(Boolean).join(" ");
  const isCompany = azubi.contact_type === "company";
  const displayName = isCompany
    ? azubi.company_name || "Firma"
    : personName || azubi.company_name || "Unbekannt";

  // Generic autosave: update a single field on blur
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

  // Stats
  const totalBookings = bookings.length;
  const courseTypeCounts: Record<string, number> = {};
  for (const b of bookings) {
    courseTypeCounts[b.course_type] = (courseTypeCounts[b.course_type] || 0) + 1;
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard/auszubildende/personen"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Alle Ärzt:innen
      </Link>

      {/* Info + Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Person info */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-xl">{displayName}</CardTitle>
              <select
                value={azubi.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className={`text-xs font-medium rounded-full px-2.5 py-1 border-0 cursor-pointer shrink-0 ${
                  azubi.status === "active"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <option value="active">Aktiv</option>
                <option value="inactive">Inaktiv</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="grid grid-cols-[100px_1fr] gap-x-4 gap-y-2.5 items-center">
              <span className="text-xs font-medium text-muted-foreground">Vorname</span>
              <input defaultValue={azubi.first_name || ""} placeholder="–" onBlur={(e) => autosave("first_name", e.target.value)} className="bg-transparent border-0 p-0 text-sm text-foreground focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50" />

              <span className="text-xs font-medium text-muted-foreground">Nachname</span>
              <input defaultValue={azubi.last_name || ""} placeholder="–" onBlur={(e) => autosave("last_name", e.target.value)} className="bg-transparent border-0 p-0 text-sm text-foreground focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50" />

              <span className="text-xs font-medium text-muted-foreground">E-Mail</span>
              <a href={`mailto:${azubi.email}`} className="text-primary hover:underline truncate">{azubi.email}</a>

              <span className="text-xs font-medium text-muted-foreground">Telefon</span>
              <input defaultValue={azubi.phone || ""} placeholder="–" onBlur={(e) => autosave("phone", e.target.value)} className="bg-transparent border-0 p-0 text-sm text-foreground focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50" />

              <span className="text-xs font-medium text-muted-foreground">Titel</span>
              <input defaultValue={azubi.title || ""} placeholder="–" onBlur={(e) => autosave("title", e.target.value)} className="bg-transparent border-0 p-0 text-sm text-foreground focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50" />

              <span className="text-xs font-medium text-muted-foreground">Geschlecht</span>
              <input defaultValue={azubi.gender || ""} placeholder="–" onBlur={(e) => autosave("gender", e.target.value)} className="bg-transparent border-0 p-0 text-sm text-foreground focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50" />

              <span className="text-xs font-medium text-muted-foreground">Fachrichtung</span>
              <input defaultValue={azubi.specialty || ""} placeholder="–" onBlur={(e) => autosave("specialty", e.target.value)} className="bg-transparent border-0 p-0 text-sm text-foreground focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50" />

              <span className="text-xs font-medium text-muted-foreground">Geburtsdatum</span>
              <input type="date" defaultValue={azubi.birthdate || ""} onBlur={(e) => autosave("birthdate", e.target.value)} className="bg-transparent border-0 p-0 text-sm text-foreground focus:outline-none focus:ring-0 w-fit" />

              <span className="text-xs font-medium text-muted-foreground">EFN</span>
              <input defaultValue={azubi.efn || ""} placeholder="–" onBlur={(e) => autosave("efn", e.target.value)} className="bg-transparent border-0 p-0 text-sm text-foreground font-mono focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50" />

              <span className="text-xs font-medium text-muted-foreground">Praxis/Firma</span>
              <input defaultValue={azubi.company_name || ""} placeholder="–" onBlur={(e) => autosave("company_name", e.target.value)} className="bg-transparent border-0 p-0 text-sm text-foreground focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50" />

              <span className="text-xs font-medium text-muted-foreground">USt.-IdNr.</span>
              <input defaultValue={azubi.vat_id || ""} placeholder="–" onBlur={(e) => autosave("vat_id", e.target.value)} className="bg-transparent border-0 p-0 text-sm text-foreground font-mono focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50" />

              <span className="text-xs font-medium text-muted-foreground">Straße</span>
              <input defaultValue={azubi.address_line1 || ""} placeholder="–" onBlur={(e) => autosave("address_line1", e.target.value)} className="bg-transparent border-0 p-0 text-sm text-foreground focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50" />

              <span className="text-xs font-medium text-muted-foreground">PLZ</span>
              <input defaultValue={azubi.address_postal_code || ""} placeholder="–" onBlur={(e) => autosave("address_postal_code", e.target.value)} className="bg-transparent border-0 p-0 text-sm text-foreground focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50" />

              <span className="text-xs font-medium text-muted-foreground">Stadt</span>
              <input defaultValue={azubi.address_city || ""} placeholder="–" onBlur={(e) => autosave("address_city", e.target.value)} className="bg-transparent border-0 p-0 text-sm text-foreground focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50" />

              <span className="text-xs font-medium text-muted-foreground">Land</span>
              <input defaultValue={azubi.address_country || ""} placeholder="DE" onBlur={(e) => autosave("address_country", e.target.value)} className="bg-transparent border-0 p-0 text-sm text-foreground focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50" />
            </div>

            <div className="pt-4 mt-4 border-t border-gray-100 text-xs text-muted-foreground">
              Erstellt am {formatDateTime(azubi.created_at)}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Statistik</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm">Buchungen gesamt</span>
              <span className="font-semibold">{totalBookings}</span>
            </div>
            {Object.entries(courseTypeCounts).sort().map(([type, count]) => (
              <div key={type} className="flex justify-between">
                <span className="text-sm text-muted-foreground">{type}</span>
                <span className="text-sm font-medium">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Emails */}
      <EmailHistory email={azubi.email} displayName={personName || undefined} canCompose={isAdmin} />

      {/* Notes */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Notizen</CardTitle>
            {!editingNotes && (
              <button
                onClick={() => { setNotes(azubi.notes || ""); setEditingNotes(true); }}
                className="p-1.5 rounded hover:bg-gray-100 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="h-4 w-4" />
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
                className="min-h-[120px]"
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

      {/* Booking history */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Buchungsverlauf</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kurstyp</TableHead>
                <TableHead>Kurs</TableHead>
                <TableHead>Kursdatum</TableHead>
                <TableHead>Kaufdatum</TableHead>
                {isAdmin && <TableHead>Betrag</TableHead>}
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="w-[60px]">Rechnung</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 5} className="text-center text-muted-foreground py-8">
                    Noch keine Buchungen vorhanden.
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <Badge variant="secondary">{booking.course_type}</Badge>
                    </TableCell>
                    <TableCell>
                      {booking.course_templates?.course_label_de || booking.course_templates?.title || "–"}
                    </TableCell>
                    <TableCell>
                      {booking.course_sessions?.label_de || booking.course_sessions?.date_iso || "–"}
                    </TableCell>
                    <TableCell>
                      {formatDate(booking.created_at)}
                    </TableCell>
                    {isAdmin && <TableCell>{formatAmount(booking.amount_paid)}</TableCell>}
                    <TableCell>
                      <Badge variant={statusVariants[booking.status]}>
                        {statusLabels[booking.status]}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        {booking.stripe_invoice_pdf_url ? (
                          <a
                            href={booking.stripe_invoice_pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
                            title="Rechnung herunterladen"
                          >
                            <FileText className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground/40">–</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
