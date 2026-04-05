"use client";

import { useState } from "react";
import Link from "next/link";
import { Patient, BookingWithDetails, BookingStatus, PatientStatus } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ArrowLeft, Mail, Phone, MapPin, AlertTriangle, Ban, ArrowUpDown, ArrowUp, ArrowDown, Pencil, Check, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { EmailHistory } from "@/components/email-history";

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

const patientStatusLabels: Record<PatientStatus, string> = {
  active: "Aktiv",
  warning: "Warnung",
  blacklist: "Blacklist",
};

interface Props {
  patient: Patient;
  bookings: BookingWithDetails[];
}

type SortKey = "course" | "date" | "status" | "booked_at";
type SortDir = "asc" | "desc";

export function PatientDetail({ patient, bookings }: Props) {
  const [status, setStatus] = useState<PatientStatus>(patient.patient_status);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [notes, setNotes] = useState(patient.notes || "");
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(patient.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const supabase = createClient();

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40 inline" />;
    return sortDir === "asc"
      ? <ArrowUp className="ml-1 h-3 w-3 inline" />
      : <ArrowDown className="ml-1 h-3 w-3 inline" />;
  }

  const sortedBookings = [...bookings].sort((a, b) => {
    let aVal: string, bVal: string;
    if (sortKey === "course") {
      aVal = a.slots?.courses?.title || "";
      bVal = b.slots?.courses?.title || "";
    } else if (sortKey === "date") {
      aVal = a.slots?.start_time || "";
      bVal = b.slots?.start_time || "";
    } else if (sortKey === "status") {
      aVal = a.status;
      bVal = b.status;
    } else {
      aVal = a.created_at;
      bVal = b.created_at;
    }
    return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });

  const fullName = [patient.first_name, patient.last_name].filter(Boolean).join(" ") || patient.email;
  const address = [patient.address_street, [patient.address_zip, patient.address_city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  const totalBookings = bookings.length;
  const attended = bookings.filter((b) => b.status === "attended").length;
  const noShows = bookings.filter((b) => b.status === "no_show").length;

  const handleStatusChange = async (newStatus: PatientStatus) => {
    setStatus(newStatus);
    await supabase
      .from("patients")
      .update({ patient_status: newStatus })
      .eq("id", patient.id);
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    await fetch("/api/update-patient-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: patient.id, notes: notesDraft }),
    });
    setNotes(notesDraft);
    setEditingNotes(false);
    setSavingNotes(false);
  };

  const handleCancelNotes = () => {
    setNotesDraft(notes);
    setEditingNotes(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/patients">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Alle Proband:innen
          </Button>
        </Link>
      </div>

      {/* Warning/Blacklist banner */}
      {status === "warning" && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4" />
          Diese:r Proband:in wurde mit einer Warnung markiert.
        </div>
      )}
      {status === "blacklist" && (
        <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <Ban className="h-4 w-4" />
          Diese:r Proband:in befindet sich auf der Blacklist.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Patient info */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl">{fullName}</CardTitle>
            <Select value={status} onValueChange={(val) => handleStatusChange(val as PatientStatus)}>
              <SelectTrigger className="w-[140px] h-8">
                <span>{patientStatusLabels[status]}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktiv</SelectItem>
                <SelectItem value="warning">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3 text-amber-600" />
                    Warnung
                  </span>
                </SelectItem>
                <SelectItem value="blacklist">
                  <span className="flex items-center gap-1.5">
                    <Ban className="h-3 w-3 text-red-600" />
                    Blacklist
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${patient.email}`} className="hover:underline">
                {patient.email}
              </a>
            </div>
            {patient.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${patient.phone}`} className="hover:underline">
                  {patient.phone}
                </a>
              </div>
            )}
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                {patient.address_street ? (
                  <>
                    <div>{patient.address_street}</div>
                    <div>{[patient.address_zip, patient.address_city].filter(Boolean).join(" ")}</div>
                  </>
                ) : (
                  <span className="text-muted-foreground">Keine Adresse hinterlegt</span>
                )}
              </div>
            </div>
            <div className="text-xs text-muted-foreground pt-2">
              Erstellt am {format(new Date(patient.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Statistik</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Buchungen gesamt</span>
              <span className="font-medium">{totalBookings}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Erschienen</span>
              <span className="font-medium text-green-600">{attended}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">No-Shows</span>
              <span className="font-medium text-red-600">{noShows}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Emails */}
      {patient.email && (
        <EmailHistory
          email={patient.email}
          displayName={
            [patient.first_name, patient.last_name].filter(Boolean).join(" ") ||
            undefined
          }
        />
      )}

      {/* Notes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Notizen</CardTitle>
          {!editingNotes && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setNotesDraft(notes); setEditingNotes(true); }}
            >
              <Pencil className="h-4 w-4 mr-1" />
              {notes ? "Bearbeiten" : "Notiz hinzufügen"}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingNotes ? (
            <div className="space-y-2">
              <Textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder="Notizen zu diesem:r Proband:in..."
                className="min-h-[120px] resize-y"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveNotes} disabled={savingNotes}>
                  <Check className="h-4 w-4 mr-1" />
                  {savingNotes ? "Speichern..." : "Speichern"}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancelNotes} disabled={savingNotes}>
                  <X className="h-4 w-4 mr-1" />
                  Abbrechen
                </Button>
              </div>
            </div>
          ) : notes ? (
            <p className="text-sm whitespace-pre-wrap">{notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Noch keine Notizen vorhanden.</p>
          )}
        </CardContent>
      </Card>

      {/* Booking history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Buchungsverlauf</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {bookings.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Noch keine Buchungen vorhanden
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("course")}>Kurs<SortIcon col="course" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("date")}>Datum<SortIcon col="date" /></TableHead>
                  <TableHead>Uhrzeit</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("status")}>Status<SortIcon col="status" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("booked_at")}>Gebucht am<SortIcon col="booked_at" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      {booking.slots?.courses?.title || ""}
                    </TableCell>
                    <TableCell>
                      {booking.slots?.start_time
                        ? format(new Date(booking.slots.start_time), "dd.MM.yyyy", { locale: de })
                        : ""}
                    </TableCell>
                    <TableCell>
                      {booking.slots?.start_time
                        ? format(new Date(booking.slots.start_time), "HH:mm", { locale: de }) + " Uhr"
                        : ""}
                    </TableCell>
                    <TableCell>
                      <Badge variant={bookingStatusVariants[booking.status]}>
                        {bookingStatusLabels[booking.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(booking.created_at), "dd.MM.yyyy", { locale: de })}
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
