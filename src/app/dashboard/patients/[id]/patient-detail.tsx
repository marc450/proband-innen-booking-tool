"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Patient, BookingWithDetails, BookingStatus, PatientStatus } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { EmailHistory } from "@/components/email-history";
import { ArrowLeft, Pencil, AlertTriangle, Ban, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const bookingStatusLabels: Record<BookingStatus, string> = {
  booked: "Gebucht",
  attended: "Erschienen",
  no_show: "No-Show",
  cancelled: "Storniert",
};

const bookingStatusVariants: Record<BookingStatus, "default" | "secondary" | "destructive" | "outline"> = {
  booked: "default",
  attended: "secondary",
  no_show: "destructive",
  cancelled: "outline",
};

interface Props {
  patient: Patient;
  bookings: BookingWithDetails[];
  isAdmin?: boolean;
}

const fieldClass = "bg-transparent border-0 p-0 text-sm text-foreground focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50 w-full";

export function PatientDetail({ patient: initialPatient, bookings, isAdmin = true }: Props) {
  const supabase = createClient();
  const [patient, setPatient] = useState(initialPatient);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(patient.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);

  // Name edit popover
  const [namePopoverOpen, setNamePopoverOpen] = useState(false);
  const namePopoverRef = useRef<HTMLDivElement>(null);

  // Status dropdown
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  const personName = [patient.first_name, patient.last_name].filter(Boolean).join(" ");

  // Force any focused input inside the popover to blur synchronously
  // BEFORE we unmount it. Without this, React's synthetic `onBlur` is
  // dropped when the input unmounts in the same tick as the close, and
  // any pending autosave (e.g. a freshly typed Vorname) is lost.
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

  // Autosave encrypted patient fields via API
  const autosave = async (field: string, value: string) => {
    const trimmed = value.trim() || null;
    if (trimmed === (patient[field as keyof typeof patient] ?? null)) return;
    const res = await fetch("/api/update-patient-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: patient.id, fields: { [field]: trimmed } }),
    });
    if (res.ok) {
      setPatient((prev) => ({ ...prev, [field]: trimmed }));
    }
  };

  const handleStatusChange = async (newStatus: PatientStatus) => {
    setPatient((prev) => ({ ...prev, patient_status: newStatus }));
    await supabase
      .from("patients")
      .update({ patient_status: newStatus })
      .eq("id", patient.id);
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    const res = await fetch("/api/update-patient-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: patient.id, notes }),
    });
    if (res.ok) {
      setPatient((prev) => ({ ...prev, notes }));
      setEditingNotes(false);
    }
    setSavingNotes(false);
  };

  const formatDate = (iso: string) => {
    return format(new Date(iso), "dd.MM.yyyy", { locale: de });
  };

  const formatDateTime = (iso: string) => {
    return format(new Date(iso), "dd.MM.yyyy HH:mm", { locale: de });
  };

  const totalBookings = bookings.length;
  const attended = bookings.filter((b) => b.status === "attended").length;
  const noShows = bookings.filter((b) => b.status === "no_show").length;

  return (
    <div className="space-y-4">
      {/* Back link */}
      <Link
        href="/dashboard/patients"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Alle Proband:innen
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
                  <h1 className="text-xl font-semibold">
                    {personName || "Unbekannt"}
                  </h1>
                  <button
                    onClick={() => {
                      if (namePopoverOpen) flushNamePopoverFocus();
                      setNamePopoverOpen(!namePopoverOpen);
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
                    {patient.email && (
                      <div className="text-[11px] text-muted-foreground break-all bg-muted/50 rounded px-2 py-1.5">
                        <span className="uppercase tracking-wider font-medium">E-Mail</span>
                        <div className="text-foreground break-all">{patient.email}</div>
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-muted-foreground">Vorname</label>
                      <input
                        defaultValue={patient.first_name || ""}
                        onBlur={(e) => autosave("first_name", e.target.value)}
                        autoFocus
                        className="w-full mt-1 border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Nachname</label>
                      <input
                        defaultValue={patient.last_name || ""}
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
                    patient.patient_status === "active"
                      ? "bg-emerald-100 text-emerald-700"
                      : patient.patient_status === "warning"
                      ? "bg-amber-100 text-amber-700"
                      : patient.patient_status === "blacklist"
                      ? "bg-red-100 text-red-700"
                      : patient.patient_status === "inactive"
                      ? "bg-gray-200 text-gray-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {patient.patient_status === "active" && <CheckCircle2 className="h-3 w-3" />}
                  {patient.patient_status === "warning" && <AlertTriangle className="h-3 w-3" />}
                  {patient.patient_status === "blacklist" && <Ban className="h-3 w-3" />}
                  {patient.patient_status === "inactive" && <Ban className="h-3 w-3" />}
                  {patient.patient_status === "active"
                    ? "Aktiv"
                    : patient.patient_status === "warning"
                    ? "Warnung"
                    : patient.patient_status === "blacklist"
                    ? "Blacklist"
                    : "Inaktiv"}
                </button>
                {statusDropdownOpen && (
                  <div className="absolute z-50 mt-1 left-0 bg-popover border rounded-md shadow-md py-1 min-w-[180px]">
                    {(["active", "warning", "blacklist", "inactive"] as PatientStatus[]).map((s) => (
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
            </CardContent>
          </Card>

          {/* Kontakt */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Kontakt</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-2 items-center">
                <span className="text-xs text-muted-foreground">E-Mail</span>
                <a href={`mailto:${patient.email}`} className="text-primary hover:underline truncate text-sm">{patient.email}</a>

                <span className="text-xs text-muted-foreground">Telefon</span>
                <input defaultValue={patient.phone || ""} placeholder="–" onBlur={(e) => autosave("phone", e.target.value)} className={fieldClass} />
              </div>
            </CardContent>
          </Card>

          {/* Adresse */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Adresse</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-2 items-center">
                <span className="text-xs text-muted-foreground">Straße</span>
                <input defaultValue={patient.address_street || ""} placeholder="–" onBlur={(e) => autosave("address_street", e.target.value)} className={fieldClass} />

                <span className="text-xs text-muted-foreground">PLZ</span>
                <input defaultValue={patient.address_zip || ""} placeholder="–" onBlur={(e) => autosave("address_zip", e.target.value)} className={fieldClass} />

                <span className="text-xs text-muted-foreground">Stadt</span>
                <input defaultValue={patient.address_city || ""} placeholder="–" onBlur={(e) => autosave("address_city", e.target.value)} className={fieldClass} />
              </div>
            </CardContent>
          </Card>

          <div className="text-xs text-muted-foreground px-1">
            Erstellt am {formatDateTime(patient.created_at)}
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
                    onClick={() => { setNotes(patient.notes || ""); setEditingNotes(true); }}
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
                  {patient.notes || "Keine Notizen vorhanden."}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Emails */}
          {patient.email && (
            <EmailHistory
              email={patient.email}
              displayName={personName || undefined}
              canCompose={isAdmin}
            />
          )}
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
              <div className="flex justify-between">
                <span className="text-sm">Erschienen</span>
                <span className="text-sm font-semibold text-green-600">{attended}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">No-Shows</span>
                <span className="text-sm font-semibold text-red-600">{noShows}</span>
              </div>
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
                          {booking.slots?.courses?.title || "–"}
                        </span>
                        <Badge variant={bookingStatusVariants[booking.status]} className="shrink-0 text-[10px]">
                          {bookingStatusLabels[booking.status]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {booking.slots?.start_time && (
                          <>
                            <span>{format(new Date(booking.slots.start_time), "dd.MM.yyyy", { locale: de })}</span>
                            <span>{format(new Date(booking.slots.start_time), "HH:mm", { locale: de })} Uhr</span>
                          </>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Gebucht am {formatDate(booking.created_at)}
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
