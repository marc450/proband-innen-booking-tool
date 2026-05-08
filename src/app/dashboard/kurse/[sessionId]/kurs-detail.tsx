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
import { ArrowLeft, Ban, Calendar, Check, Clock, GraduationCap, Mail, MapPin, Plus, Trash2, User } from "lucide-react";

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
  /** Patient row this booking is linked to. Used to deep-link the
   *  contact name to /dashboard/patients/[patient_id]. */
  patient_id: string | null;
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
  /** Auszubildende:r row this booking is linked to. Used to deep-link
   *  the contact name to /dashboard/auszubildende/personen/[id]. */
  auszubildendeId: string | null;
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
  const [slotBlockedInput, setSlotBlockedInput] = useState(false);
  const [slotBlockNoteInput, setSlotBlockNoteInput] = useState("");
  const [deleteSlotId, setDeleteSlotId] = useState<string | null>(null);

  const openAddSlot = () => {
    setEditingSlot(null);
    setSlotTimeInput("");
    setSlotCapacityInput("1");
    setSlotBlockedInput(false);
    setSlotBlockNoteInput("");
    setSlotDialogOpen(true);
  };

  const openEditSlot = (slot: DetailSlot) => {
    setEditingSlot(slot);
    setSlotTimeInput(formatBerlinTime(slot.start_time));
    setSlotCapacityInput(String(slot.capacity));
    setSlotBlockedInput(slot.blocked);
    setSlotBlockNoteInput(slot.blocked_note ?? "");
    setSlotDialogOpen(true);
  };

  const saveSlot = async () => {
    if (!satelliteId || !slotTimeInput) return;
    const capacity = parseInt(slotCapacityInput) || 1;
    const startTime = buildBerlinTimestamp(session.dateIso, slotTimeInput);
    const payload = {
      start_time: startTime,
      capacity,
      blocked: slotBlockedInput,
      blocked_note: slotBlockedInput ? slotBlockNoteInput.trim() || null : null,
    };
    if (editingSlot) {
      await supabase.from("slots").update(payload).eq("id", editingSlot.id);
    } else {
      await supabase.from("slots").insert({ course_id: satelliteId, ...payload });
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
          <Table className="table-fixed">
            {/* Shared column widths so the Auszubildende and Proband:innen
                tables align column-for-column on the page. The same
                <colgroup> repeats on the Proband:innen table below. */}
            <colgroup>
              <col style={{ width: "200px" }} />{/* Name */}
              <col style={{ width: "280px" }} />{/* E-Mail */}
              <col style={{ width: "220px" }} />{/* Bereits besuchte Kurse | Uhrzeit */}
              <col style={{ width: "200px" }} />{/* Spezialisierung | Überweiser:in */}
              <col style={{ width: "240px" }} />{/* Profil | Notizen */}
              <col style={{ width: "180px" }} />{/* Status */}
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>E-Mail</TableHead>
                <TableHead>Bereits besuchte Kurse</TableHead>
                <TableHead>Spezialisierung</TableHead>
                <TableHead>Profil</TableHead>
                <TableHead>
                  <div className="flex justify-end">
                    <span className="w-[140px]">Status</span>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aerztBookingsState.map((b) => {
                const fullName =
                  [b.firstName, b.lastName].filter(Boolean).join(" ") || "—";
                return (
                <TableRow key={b.id} className="h-14">
                  <TableCell className="font-medium">
                    {b.auszubildendeId ? (
                      <Link
                        href={`/dashboard/auszubildende/personen/${b.auszubildendeId}`}
                        className="text-[#0066FF] hover:underline"
                      >
                        {fullName}
                      </Link>
                    ) : (
                      fullName
                    )}
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
                    {b.profileComplete ? (
                      <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">
                        vollständig
                      </Badge>
                    ) : (
                      <div className="inline-flex items-center gap-1.5">
                        <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                          unvollständig
                        </Badge>
                        <SendProfileReminderButton bookingId={b.id} disabled={!b.email} />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="w-[180px]">
                    <div className="flex justify-end">
                      <select
                        value={b.status ?? "booked"}
                        onChange={(e) => updateAerztStatus(b.id, e.target.value)}
                        className="h-9 border border-input rounded-lg px-2 text-sm bg-transparent w-[140px]"
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
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>

      {/* ── Proband:innen Slots & Buchungen ─────────────────────────── */}
      <section className="rounded-[10px] bg-card ring-1 ring-black/5 overflow-hidden">
        <div className="px-6 pt-6 pb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            Buchungen Proband:innen ({bookings.length}/{slots.filter((s) => !s.blocked).reduce((sum, sl) => sum + sl.capacity, 0)})
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
          <Table className="table-fixed">
            {/* Same column widths as the Auszubildende table above so
                the two tables align column-for-column on the page. */}
            <colgroup>
              <col style={{ width: "200px" }} />{/* Name */}
              <col style={{ width: "280px" }} />{/* E-Mail */}
              <col style={{ width: "220px" }} />{/* Uhrzeit */}
              <col style={{ width: "200px" }} />{/* Überweiser:in */}
              <col style={{ width: "240px" }} />{/* Notizen */}
              <col style={{ width: "180px" }} />{/* Status */}
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>E-Mail</TableHead>
                <TableHead>Uhrzeit</TableHead>
                <TableHead>Überweiser:in</TableHead>
                <TableHead>Notizen</TableHead>
                <TableHead>
                  <div className="flex justify-end">
                    <span className="w-[140px]">Status</span>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slots.flatMap((slot) => {
                const slotBookings = bookings.filter((b) => b.slot_id === slot.id);
                if (slot.blocked && slotBookings.length === 0) {
                  return [
                    <TableRow key={slot.id} className="h-14">
                      <TableCell className="text-sm text-muted-foreground italic">{/* Name */}
                        <span className="inline-flex items-center gap-1.5">
                          <Ban className="h-3.5 w-3.5" />
                          {slot.blocked_note ? `Gesperrt: ${slot.blocked_note}` : "Gesperrt"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">—</TableCell>{/* E-Mail */}
                      <TableCell className="font-medium text-muted-foreground line-through">{/* Uhrzeit */}
                        <button onClick={() => openEditSlot(slot)} className="hover:no-underline">
                          {formatBerlinTime(slot.start_time)}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">—</TableCell>{/* Überweiser:in */}
                      <TableCell className="text-sm text-muted-foreground">—</TableCell>{/* Notizen */}
                      <TableCell className="w-[180px] text-right text-sm text-muted-foreground">—</TableCell>{/* Status */}
                    </TableRow>,
                  ];
                }
                if (slotBookings.length === 0) {
                  return [
                    <TableRow key={slot.id} className="h-14">
                      <TableCell className="text-sm text-muted-foreground italic">Frei</TableCell>{/* Name */}
                      <TableCell className="text-sm text-muted-foreground">—</TableCell>{/* E-Mail */}
                      <TableCell className="font-medium">{/* Uhrzeit */}
                        <button onClick={() => openEditSlot(slot)} className="hover:underline">
                          {formatBerlinTime(slot.start_time)}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">—</TableCell>{/* Überweiser:in */}
                      <TableCell className="text-sm text-muted-foreground">—</TableCell>{/* Notizen */}
                      <TableCell className="w-[180px] text-sm text-muted-foreground">{/* Status */}
                        <div className="flex justify-end">
                          <span className="w-[140px]">—</span>
                        </div>
                      </TableCell>
                    </TableRow>,
                  ];
                }
                return slotBookings.map((booking) => {
                  const fullName =
                    [booking.first_name, booking.last_name]
                      .filter(Boolean)
                      .join(" ") || "—";
                  return (
                  <TableRow key={booking.id} className="h-14">
                    <TableCell className="font-medium">{/* Name */}
                      {booking.patient_id ? (
                        <Link
                          href={`/dashboard/patients/${booking.patient_id}`}
                          className="text-[#0066FF] hover:underline"
                        >
                          {fullName}
                        </Link>
                      ) : (
                        fullName
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{booking.email}</TableCell>{/* E-Mail */}
                    <TableCell className="font-medium">{/* Uhrzeit */}
                      <button onClick={() => openEditSlot(slot)} className="hover:underline">
                        {formatBerlinTime(slot.start_time)}
                      </button>
                    </TableCell>
                    <TableCell className="text-sm">{/* Überweiser:in */}
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
                    <TableCell className="w-[180px]">
                      <div className="flex justify-end">
                        <select
                          value={booking.status}
                          onChange={(e) =>
                            updateBookingStatus(booking, e.target.value as DetailBooking["status"])
                          }
                          className="h-9 border border-input rounded-lg px-2 text-sm bg-transparent w-[140px]"
                        >
                          {BOOKING_STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                });
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
                disabled={slotBlockedInput}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Plätze</Label>
              <Input
                type="number"
                min={1}
                value={slotCapacityInput}
                onChange={(e) => setSlotCapacityInput(e.target.value)}
                disabled={slotBlockedInput}
              />
            </div>
            <div className="space-y-1.5 pt-2 border-t">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={slotBlockedInput}
                  onChange={(e) => {
                    setSlotBlockedInput(e.target.checked);
                    if (!e.target.checked) setSlotBlockNoteInput("");
                  }}
                  disabled={
                    !!editingSlot && bookings.some((b) => b.slot_id === editingSlot.id)
                  }
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">Slot sperren</span>
              </label>
              {!!editingSlot && bookings.some((b) => b.slot_id === editingSlot.id) && (
                <p className="text-xs text-muted-foreground pl-6">
                  Slot mit Buchung kann nicht gesperrt werden.
                </p>
              )}
              {slotBlockedInput && (
                <Input
                  className="mt-2"
                  placeholder="Notiz (optional, z.B. Bereits extern gebucht)"
                  value={slotBlockNoteInput}
                  onChange={(e) => setSlotBlockNoteInput(e.target.value)}
                />
              )}
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

// Small icon button that triggers the "complete your profile"
// reminder email server-side via /api/admin/send-profile-reminder.
// Posts the booking id; the API resolves the email + first_name and
// hands off to sendProfileReminderEmail in lib/post-purchase.
function SendProfileReminderButton({
  bookingId,
  disabled,
}: {
  bookingId: string;
  disabled?: boolean;
}) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const onSend = async () => {
    if (sending || disabled) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/send-profile-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      if (res.ok) {
        setSent(true);
        setTimeout(() => setSent(false), 1800);
      } else {
        console.error("send-profile-reminder failed", await res.text());
      }
    } catch (err) {
      console.error("send-profile-reminder failed", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onSend}
      disabled={disabled || sending}
      className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground disabled:cursor-not-allowed"
      title={
        disabled
          ? "Keine E-Mail hinterlegt"
          : sent
            ? "E-Mail gesendet"
            : sending
              ? "Wird gesendet…"
              : "Profil-Link per E-Mail senden"
      }
    >
      {sent ? <Check className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
    </button>
  );
}
