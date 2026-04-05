"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ArrowLeft, Pencil, FileText, Mail, Phone, Building2, MapPin } from "lucide-react";
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

export function AuszubildendeDetail({ azubi: initialAzubi, bookings }: Props) {
  const supabase = createClient();
  const [azubi, setAzubi] = useState(initialAzubi);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(azubi.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);

  // Address editor state
  const [editingAddress, setEditingAddress] = useState(false);
  const [addrLine1, setAddrLine1] = useState(azubi.address_line1 || "");
  const [addrPostal, setAddrPostal] = useState(azubi.address_postal_code || "");
  const [addrCity, setAddrCity] = useState(azubi.address_city || "");
  const [addrCountry, setAddrCountry] = useState(azubi.address_country || "DE");
  const [savingAddress, setSavingAddress] = useState(false);

  const hasAddress = !!(
    azubi.address_line1 ||
    azubi.address_postal_code ||
    azubi.address_city
  );

  const openAddressEditor = () => {
    setAddrLine1(azubi.address_line1 || "");
    setAddrPostal(azubi.address_postal_code || "");
    setAddrCity(azubi.address_city || "");
    setAddrCountry(azubi.address_country || "DE");
    setEditingAddress(true);
  };

  const handleSaveAddress = async () => {
    setSavingAddress(true);
    const patch = {
      address_line1: addrLine1.trim() || null,
      address_postal_code: addrPostal.trim() || null,
      address_city: addrCity.trim() || null,
      address_country: addrCountry.trim() || null,
    };
    const { error } = await supabase
      .from("auszubildende")
      .update(patch)
      .eq("id", azubi.id);
    if (!error) {
      setAzubi((prev) => ({ ...prev, ...patch }));
      setEditingAddress(false);
    }
    setSavingAddress(false);
  };

  const personName = [azubi.first_name, azubi.last_name].filter(Boolean).join(" ");
  const isCompany = azubi.contact_type === "company";
  const name = isCompany
    ? azubi.company_name || "Firma"
    : personName || azubi.company_name || "Unbekannt";

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
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{name}</CardTitle>
              <select
                value={azubi.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className={`text-xs font-medium rounded-full px-2.5 py-1 border-0 cursor-pointer ${
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
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${azubi.email}`} className="text-primary hover:underline">
                {azubi.email}
              </a>
            </div>
            {azubi.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${azubi.phone}`} className="text-primary hover:underline">
                  {azubi.phone}
                </a>
              </div>
            )}
            {azubi.company_name && !isCompany && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">{azubi.company_name}</span>
                <span className="text-xs text-muted-foreground">(Praxis/Firma)</span>
              </div>
            )}
            {azubi.vat_id && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="w-24 text-xs font-medium">USt.-IdNr.</span>
                <span className="text-foreground font-mono">{azubi.vat_id}</span>
              </div>
            )}
            {editingAddress ? (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-2.5" />
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Straße und Hausnummer"
                    value={addrLine1}
                    onChange={(e) => setAddrLine1(e.target.value)}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="PLZ"
                      value={addrPostal}
                      onChange={(e) => setAddrPostal(e.target.value)}
                    />
                    <Input
                      placeholder="Stadt"
                      value={addrCity}
                      onChange={(e) => setAddrCity(e.target.value)}
                      className="col-span-2"
                    />
                  </div>
                  <Input
                    placeholder="Land (ISO, z.B. DE)"
                    value={addrCountry}
                    onChange={(e) => setAddrCountry(e.target.value)}
                  />
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={handleSaveAddress} disabled={savingAddress}>
                      {savingAddress ? "Speichern..." : "Speichern"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingAddress(false)}
                      disabled={savingAddress}
                    >
                      Abbrechen
                    </Button>
                  </div>
                </div>
              </div>
            ) : hasAddress ? (
              <div className="flex items-start gap-2 group">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-foreground leading-snug flex-1">
                  {azubi.address_line1 && <div>{azubi.address_line1}</div>}
                  {(azubi.address_postal_code || azubi.address_city) && (
                    <div>
                      {[azubi.address_postal_code, azubi.address_city]
                        .filter(Boolean)
                        .join(" ")}
                    </div>
                  )}
                  {azubi.address_country && azubi.address_country !== "DE" && (
                    <div>{azubi.address_country}</div>
                  )}
                </div>
                <button
                  onClick={openAddressEditor}
                  className="p-1 rounded hover:bg-gray-100 text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                  title="Adresse bearbeiten"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={openAddressEditor}
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                title="Adresse hinzufügen"
              >
                <MapPin className="h-4 w-4" />
                <span className="text-xs underline-offset-2 hover:underline">
                  Adresse hinzufügen
                </span>
              </button>
            )}
            {isCompany && personName && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="w-24 text-xs font-medium">Ansprechperson</span>
                <span className="text-foreground">{personName}</span>
              </div>
            )}
            {/* Profile fields */}
            {azubi.profile_complete && (
              <div className="pt-3 mt-3 border-t border-gray-100 space-y-1.5">
                {azubi.title && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="w-24 text-xs font-medium">Titel</span>
                    <span className="text-foreground">{azubi.title}</span>
                  </div>
                )}
                {azubi.gender && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="w-24 text-xs font-medium">Geschlecht</span>
                    <span className="text-foreground">{azubi.gender}</span>
                  </div>
                )}
                {azubi.specialty && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="w-24 text-xs font-medium">Fachrichtung</span>
                    <span className="text-foreground">{azubi.specialty}</span>
                  </div>
                )}
                {azubi.birthdate && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="w-24 text-xs font-medium">Geburtsdatum</span>
                    <span className="text-foreground">{formatDate(azubi.birthdate)}</span>
                  </div>
                )}
                {azubi.efn && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="w-24 text-xs font-medium">EFN</span>
                    <span className="text-foreground font-mono">{azubi.efn}</span>
                  </div>
                )}
              </div>
            )}
            {!azubi.profile_complete && (
              <div className="pt-3 mt-3 border-t border-gray-100">
                <span className="text-xs text-amber-600 font-medium">Profil unvollständig</span>
              </div>
            )}
            <div className="pt-2 text-xs text-muted-foreground">
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
      <EmailHistory email={azubi.email} displayName={personName || undefined} />

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
                <TableHead>Betrag</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[60px]">Rechnung</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
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
                    <TableCell>{formatAmount(booking.amount_paid)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[booking.status]}>
                        {statusLabels[booking.status]}
                      </Badge>
                    </TableCell>
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
