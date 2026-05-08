"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ArrowLeft, Calendar, Check, Clock, Copy, GraduationCap, MapPin, Plus, Trash2, User } from "lucide-react";

export interface DetailSlot {
  id: string;
  start_time: string;
  end_time: string | null;
  capacity: number;
  blocked: boolean;
  blocked_note: string | null;
}

export interface DetailBooking {
  id: string;
  slot_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  notes: string | null;
  status: "booked" | "attended" | "no_show" | "cancelled";
  booking_type: string | null;
  referring_doctor: string | null;
  created_at: string;
}

interface AerztBooking {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  courseType: string | null;
  status: string | null;
  specialty: string | null;
  priorCourses: string[];
  profileComplete: boolean;
}

const AERZT_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "booked", label: "Gebucht" },
  { value: "completed", label: "Abgeschlossen" },
  { value: "cancelled", label: "Storniert" },
  { value: "refunded", label: "Erstattet" },
];

interface SessionData {
  id: string;
  templateTitle: string;
  dateIso: string;
  startTime: string | null;
  durationMinutes: number | null;
  address: string | null;
  instructorName: string | null;
  betreuerName: string | null;
  maxSeats: number;
  bookedSeats: number;
}

interface Props {
  session: SessionData;
  satelliteId: string | null;
  slots: DetailSlot[];
  bookings: DetailBooking[];
  aerztBookings: AerztBooking[];
}

const BOOKING_STATUS_OPTIONS: Array<{ value: DetailBooking["status"]; label: string }> = [
  { value: "booked", label: "Gebucht" },
  { value: "attended", label: "Erschienen" },
  { value: "no_show", label: "Nicht erschienen" },
  { value: "cancelled", label: "Storniert" },
];

function buildBerlinTimestamp(dateIso: string, hhmm: string): string {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    timeZoneName: "longOffset",
  });
  const parts = fmt.formatToParts(new Date(`${dateIso}T12:00:00Z`));
  const raw = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+01:00";
  const offset = raw.replace("GMT", "") || "+01:00";
  return `${dateIso}T${hhmm}:00${offset}`;
}

function formatBerlinTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function KursDetailClient({
  session,
  satelliteId,
  slots: initialSlots,
  bookings: initialBookings,
  aerztBookings,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [, startTransition] = useTransition();

  const [slots, setSlots] = useState<DetailSlot[]>(initialSlots);
  const [bookings, setBookings] = useState<DetailBooking[]>(initialBookings);

  const refresh = () => startTransition(() => router.refresh());

  // ── Slot management ───────────────────────────────────────────────
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<DetailSlot | null>(null);
  const [slotTimeInput, setSlotTimeInput] = useState("");
  const [slotCapacityInput, setSlotCapacityInput] = useState("1");
  const [deleteSlotId, setDeleteSlotId] = useState<string | null>(null);

  const openAddSlot = () => {
    setEditingSlot(null);
    setSlotTimeInput("");
    setSlotCapacityInput("1");
    setSlotDialogOpen(true);
  };

  const openEditSlot = (slot: DetailSlot) => {
    setEditingSlot(slot);
    setSlotTimeInput(formatBerlinTime(slot.start_time));
    setSlotCapacityInput(String(slot.capacity));
    setSlotDialogOpen(true);
  };

  const saveSlot = async () => {
    if (!satelliteId || !slotTimeInput) return;
    const capacity = parseInt(slotCapacityInput) || 1;
    const startTime = buildBerlinTimestamp(session.dateIso, slotTimeInput);
    if (editingSlot) {
      await supabase
        .from("slots")
        .update({ start_time: startTime, capacity })
        .eq("id", editingSlot.id);
    } else {
      await supabase
        .from("slots")
        .insert({ course_id: satelliteId, start_time: startTime, capacity });
    }
    setSlotDialogOpen(false);
    refresh();
  };

  const deleteSlot = async () => {
    if (!deleteSlotId) return;
    await supabase.from("slots").delete().eq("id", deleteSlotId);
    setSlots((prev) => prev.filter((sl) => sl.id !== deleteSlotId));
    setDeleteSlotId(null);
  };

  const updateBookingStatus = async (booking: DetailBooking, newStatus: DetailBooking["status"]) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === booking.id ? { ...b, status: newStatus } : b)),
    );
    await supabase.from("bookings").update({ status: newStatus }).eq("id", booking.id);
  };

  const [aerztBookingsState, setAerztBookingsState] = useState<AerztBooking[]>(aerztBookings);

  const updateAerztStatus = async (bookingId: string, newStatus: string) => {
    setAerztBookingsState((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b)),
    );
    await supabase.from("course_bookings").update({ status: newStatus }).eq("id", bookingId);
  };

  const updateBookingNotes = async (booking: DetailBooking, newNotes: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === booking.id ? { ...b, notes: newNotes } : b)),
    );
    // Notes live inside the encrypted blob, so this goes through the
    // dedicated API route that decrypt-merges-encrypts.
    await fetch("/api/update-booking-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: booking.id, notes: newNotes.trim() || null }),
    });
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/kurse"
        className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Übersicht
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{session.templateTitle}</h1>
        <div className="text-sm text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {format(new Date(`${session.dateIso}T12:00:00`), "EEEE, dd. MMMM yyyy", { locale: de })}
          </span>
          {session.startTime && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {session.startTime}
              {session.durationMinutes ? ` (${session.durationMinutes} Min)` : ""}
            </span>
          )}
          {session.instructorName && (
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4" />
              {session.instructorName}
            </span>
          )}
          {session.betreuerName && (
            <span className="inline-flex items-center gap-1.5">
              <User className="h-4 w-4" />
              Kursbetreuung: {session.betreuerName}
            </span>
          )}
          {session.address && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {session.address}
            </span>
          )}
        </div>
      </div>

      {/* ── Auszubildende Buchungen ────────────────────────────────── */}
      <section className="rounded-[10px] bg-card ring-1 ring-black/5 overflow-hidden">
        <div className="px-6 pt-6 pb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            Buchungen Ärzt:innen ({session.bookedSeats}/{session.maxSeats})
          </h2>
        </div>
        {aerztBookingsState.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">
            Noch keine Buchungen für diese Session.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>E-Mail</TableHead>
                <TableHead>Bereits besuchte Kurse</TableHead>
                <TableHead>Spezialisierung</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Profil</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aerztBookingsState.map((b) => (
                <TableRow key={b.id} className="h-14">
                  <TableCell className="font-medium">
                    {[b.firstName, b.lastName].filter(Boolean).join(" ") || "—"}
                  </TableCell>
                  <TableCell className="text-sm">{b.email ?? "—"}</TableCell>
                  <TableCell className="text-sm">
                    {b.priorCourses.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      b.priorCourses.join(", ")
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{b.specialty ?? "—"}</TableCell>
                  <TableCell>
                    <select
                      value={b.status ?? "booked"}
                      onChange={(e) => updateAerztStatus(b.id, e.target.value)}
                      className="h-9 border border-input rounded-lg px-2 text-sm bg-transparent"
                    >
                      {AERZT_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                      {b.status && !AERZT_STATUS_OPTIONS.some((o) => o.value === b.status) && (
                        <option value={b.status}>{b.status}</option>
                      )}
                    </select>
                  </TableCell>
                  <TableCell>
                    {b.profileComplete ? (
                      <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">
                        vollständig
                      </Badge>
                    ) : (
                      <div className="inline-flex items-center gap-1.5">
                        <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                          unvollständig
                        </Badge>
                        <CopyProfileLinkButton bookingId={b.id} email={b.email ?? ""} />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {/* ── Proband:innen Slots & Buchungen ─────────────────────────── */}
      <section className="rounded-[10px] bg-card ring-1 ring-black/5 overflow-hidden">
        <div className="px-6 pt-6 pb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            Buchungen Proband:innen ({bookings.length}/{slots.reduce((sum, sl) => sum + sl.capacity, 0)})
          </h2>
          {satelliteId && (
            <Button size="sm" onClick={openAddSlot}>
              <Plus className="h-4 w-4 mr-1" />
              Slot hinzufügen
            </Button>
          )}
        </div>
        {!satelliteId ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">
            Diese Session hat keine Proband:innen-Seite.
          </p>
        ) : slots.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">
            Noch keine Slots angelegt. Klicke auf &quot;Slot hinzufügen&quot;, um den ersten anzulegen.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Uhrzeit</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>E-Mail</TableHead>
                <TableHead>Überweiser:in</TableHead>
                <TableHead>Notizen</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slots.flatMap((slot) => {
                const slotBookings = bookings.filter((b) => b.slot_id === slot.id);
                if (slotBookings.length === 0) {
                  return [
                    <TableRow key={slot.id} className="h-14">
                      <TableCell className="font-medium">
                        <button onClick={() => openEditSlot(slot)} className="hover:underline">
                          {formatBerlinTime(slot.start_time)}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground italic">Frei</TableCell>
                      <TableCell className="text-sm text-muted-foreground">—</TableCell>
                      <TableCell className="text-sm text-muted-foreground">—</TableCell>
                      <TableCell className="text-sm text-muted-foreground">—</TableCell>{/* Notizen */}
                      <TableCell className="text-sm text-muted-foreground">—</TableCell>{/* Status */}
                    </TableRow>,
                  ];
                }
                return slotBookings.map((booking) => (
                  <TableRow key={booking.id} className="h-14">
                    <TableCell className="font-medium">
                      <button onClick={() => openEditSlot(slot)} className="hover:underline">
                        {formatBerlinTime(slot.start_time)}
                      </button>
                    </TableCell>
                    <TableCell className="font-medium">
                      {[booking.first_name, booking.last_name].filter(Boolean).join(" ") || "—"}
                    </TableCell>
                    <TableCell className="text-sm">{booking.email}</TableCell>
                    <TableCell className="text-sm">
                      {booking.referring_doctor ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Input
                        defaultValue={booking.notes ?? ""}
                        onBlur={(e) => {
                          if (e.target.value !== (booking.notes ?? "")) {
                            updateBookingNotes(booking, e.target.value);
                          }
                        }}
                        placeholder="Notizen…"
                        className="text-sm h-9"
                      />
                    </TableCell>
                    <TableCell>
                      <select
                        value={booking.status}
                        onChange={(e) =>
                          updateBookingStatus(booking, e.target.value as DetailBooking["status"])
                        }
                        className="h-9 border border-input rounded-lg px-2 text-sm bg-transparent"
                      >
                        {BOOKING_STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                  </TableRow>
                ));
              })}
            </TableBody>
          </Table>
        )}
      </section>

      {/* Slot dialog */}
      <Dialog open={slotDialogOpen} onOpenChange={setSlotDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSlot ? "Slot bearbeiten" : "Neuen Slot anlegen"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Uhrzeit</Label>
              <Input
                type="time"
                value={slotTimeInput}
                onChange={(e) => setSlotTimeInput(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Plätze</Label>
              <Input
                type="number"
                min={1}
                value={slotCapacityInput}
                onChange={(e) => setSlotCapacityInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            {editingSlot ? (
              <Button
                variant="ghost"
                onClick={() => {
                  const hasBooking = bookings.some((b) => b.slot_id === editingSlot.id);
                  if (hasBooking) return;
                  setSlotDialogOpen(false);
                  setDeleteSlotId(editingSlot.id);
                }}
                disabled={bookings.some((b) => b.slot_id === editingSlot.id)}
                title={
                  bookings.some((b) => b.slot_id === editingSlot.id)
                    ? "Slot mit Buchung kann nicht gelöscht werden"
                    : "Slot löschen"
                }
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Löschen
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setSlotDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={saveSlot} disabled={!slotTimeInput}>
                Speichern
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Slot delete confirm */}
      <ConfirmDialog
        open={!!deleteSlotId}
        title="Slot löschen"
        description="Diesen Slot wirklich löschen?"
        confirmLabel="Löschen"
        onConfirm={deleteSlot}
        onCancel={() => setDeleteSlotId(null)}
      />
    </div>
  );
}

// Small icon button that copies the customer's profile-completion link
// to the clipboard. URL shape mirrors the one in
// sendProfileReminderEmail (lib/post-purchase) so the recipient lands
// on the same /courses/success page either way.
function CopyProfileLinkButton({ bookingId, email }: { bookingId: string; email: string }) {
  const [copied, setCopied] = useState(false);
  const PUBLIC_HOST = "https://proband-innen.ephia.de";
  const url = `${PUBLIC_HOST}/courses/success?booking_id=${bookingId}&email=${encodeURIComponent(email)}`;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Clipboard write failed", err);
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      title={copied ? "Link kopiert" : "Profil-Link kopieren"}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
