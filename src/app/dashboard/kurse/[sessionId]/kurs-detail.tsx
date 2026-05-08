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
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

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

interface DozentUser {
  id: string;
  title: string | null;
  firstName: string | null;
  lastName: string | null;
}

interface AerztBooking {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  courseType: string | null;
  status: string | null;
  audienceTag: string | null;
  profileComplete: boolean;
  createdAt: string;
}

interface SessionData {
  id: string;
  templateId: string | null;
  templateTitle: string;
  dateIso: string;
  labelDe: string | null;
  startTime: string | null;
  durationMinutes: number | null;
  address: string | null;
  instructorName: string | null;
  betreuerName: string | null;
  maxSeats: number;
  bookedSeats: number;
  isLive: boolean;
  cmeStatus: string | null;
  vnrPraxis: string | null;
  hasZahnmedizin: boolean;
}

interface Props {
  session: SessionData;
  satelliteId: string | null;
  slots: DetailSlot[];
  bookings: DetailBooking[];
  aerztBookings: AerztBooking[];
  dozentUsers: DozentUser[];
  betreuerUsers: DozentUser[];
}

const CME_OPTIONS = [
  "Nicht beantragt",
  "LÄK Berlin",
  "LÄK Brandenburg",
  "Buchung auf anderen Kurs",
] as const;

const BOOKING_STATUS_OPTIONS: Array<{ value: DetailBooking["status"]; label: string }> = [
  { value: "booked", label: "Gebucht" },
  { value: "attended", label: "Erschienen" },
  { value: "no_show", label: "Nicht erschienen" },
  { value: "cancelled", label: "Storniert" },
];

function dozentName(d: DozentUser): string {
  return [d.title, d.firstName, d.lastName].filter(Boolean).join(" ");
}

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
  dozentUsers,
  betreuerUsers,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [, startTransition] = useTransition();

  const [s, setS] = useState(session);
  const [slots, setSlots] = useState<DetailSlot[]>(initialSlots);
  const [bookings, setBookings] = useState<DetailBooking[]>(initialBookings);

  const refresh = () => startTransition(() => router.refresh());

  // ── Session-Info edits ────────────────────────────────────────────
  // Most fields auto-save on blur via supabase update. Date and address
  // also flow into the satellite via the 074 trigger; instructor name
  // changes additionally sync the satellite's instructor_id by name
  // lookup so the FK stays current.
  const updateSession = async (patch: Partial<SessionData>, dbPatch: Record<string, unknown>) => {
    setS((prev) => ({ ...prev, ...patch }));
    await supabase.from("course_sessions").update(dbPatch).eq("id", s.id);
  };

  const onInstructorChange = async (newName: string) => {
    setS((prev) => ({ ...prev, instructorName: newName || null }));
    await supabase
      .from("course_sessions")
      .update({ instructor_name: newName || null })
      .eq("id", s.id);
    if (satelliteId) {
      const matching = dozentUsers.find((d) => dozentName(d) === newName);
      await supabase
        .from("courses")
        .update({ instructor_id: matching?.id ?? null })
        .eq("id", satelliteId);
    }
  };

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
    const startTime = buildBerlinTimestamp(s.dateIso, slotTimeInput);
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
        <h1 className="text-2xl font-bold">{s.templateTitle}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {format(new Date(`${s.dateIso}T12:00:00`), "EEEE, dd. MMMM yyyy", { locale: de })}
          {s.startTime ? ` · ${s.startTime} Uhr` : ""}
          {s.address ? ` · ${s.address}` : ""}
        </p>
      </div>

      {/* ── Session-Info ───────────────────────────────────────────── */}
      <section className="rounded-[10px] bg-card p-6 ring-1 ring-black/5 space-y-4">
        <h2 className="text-lg font-semibold">Session-Info</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <select
              value={s.isLive ? "live" : "offline"}
              onChange={(e) =>
                updateSession({ isLive: e.target.value === "live" }, { is_live: e.target.value === "live" })
              }
              className="h-10 w-full border border-input rounded-lg px-2.5 text-sm bg-transparent"
            >
              <option value="live">Live</option>
              <option value="offline">Offline</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Datum</Label>
            <Input
              type="date"
              value={s.dateIso}
              onChange={(e) => setS((prev) => ({ ...prev, dateIso: e.target.value }))}
              onBlur={(e) => {
                if (e.target.value !== session.dateIso) {
                  updateSession({ dateIso: e.target.value }, { date_iso: e.target.value });
                }
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Startzeit</Label>
            <Input
              type="time"
              value={s.startTime ?? ""}
              onChange={(e) => setS((prev) => ({ ...prev, startTime: e.target.value || null }))}
              onBlur={(e) =>
                updateSession({ startTime: e.target.value || null }, { start_time: e.target.value || null })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Dauer (Minuten)</Label>
            <Input
              type="number"
              min={1}
              value={s.durationMinutes ?? ""}
              onChange={(e) =>
                setS((prev) => ({
                  ...prev,
                  durationMinutes: e.target.value ? parseInt(e.target.value) : null,
                }))
              }
              onBlur={(e) =>
                updateSession(
                  { durationMinutes: e.target.value ? parseInt(e.target.value) : null },
                  { duration_minutes: e.target.value ? parseInt(e.target.value) : null },
                )
              }
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Adresse</Label>
            <Input
              value={s.address ?? ""}
              onChange={(e) => setS((prev) => ({ ...prev, address: e.target.value || null }))}
              onBlur={(e) =>
                updateSession({ address: e.target.value || null }, { address: e.target.value || null })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Dozent:in</Label>
            <select
              value={s.instructorName ?? ""}
              onChange={(e) => onInstructorChange(e.target.value)}
              className="h-10 w-full border border-input rounded-lg px-2.5 text-sm bg-transparent"
            >
              <option value="">— wählen —</option>
              {dozentUsers.map((d) => {
                const name = dozentName(d);
                return (
                  <option key={d.id} value={name}>
                    {name}
                  </option>
                );
              })}
              {s.instructorName &&
                !dozentUsers.some((d) => dozentName(d) === s.instructorName) && (
                  <option value={s.instructorName}>{s.instructorName}</option>
                )}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Kursbetreuung</Label>
            <select
              value={s.betreuerName ?? ""}
              onChange={(e) => {
                const v = e.target.value || null;
                updateSession({ betreuerName: v }, { betreuer_name: v });
              }}
              className="h-10 w-full border border-input rounded-lg px-2.5 text-sm bg-transparent"
            >
              <option value="">— wählen —</option>
              {betreuerUsers.map((d) => {
                const name = dozentName(d);
                return (
                  <option key={d.id} value={name}>
                    {name}
                  </option>
                );
              })}
              {s.betreuerName && !betreuerUsers.some((d) => dozentName(d) === s.betreuerName) && (
                <option value={s.betreuerName}>{s.betreuerName}</option>
              )}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Max. Plätze Ärzt:innen</Label>
            <Input
              type="number"
              min={1}
              value={s.maxSeats}
              onChange={(e) => setS((prev) => ({ ...prev, maxSeats: parseInt(e.target.value) || 0 }))}
              onBlur={(e) =>
                updateSession(
                  { maxSeats: parseInt(e.target.value) || 0 },
                  { max_seats: parseInt(e.target.value) || 0 },
                )
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>CME Beantragung</Label>
            <select
              value={s.cmeStatus ?? "Nicht beantragt"}
              onChange={(e) => updateSession({ cmeStatus: e.target.value }, { cme_status: e.target.value })}
              className="h-10 w-full border border-input rounded-lg px-2.5 text-sm bg-transparent"
            >
              {CME_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>VNR (Praxiskurs)</Label>
            <Input
              value={s.vnrPraxis ?? ""}
              onChange={(e) => setS((prev) => ({ ...prev, vnrPraxis: e.target.value || null }))}
              onBlur={(e) =>
                updateSession({ vnrPraxis: e.target.value || null }, { vnr_praxis: e.target.value || null })
              }
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Zahnmedizin</Label>
            <select
              value={s.hasZahnmedizin ? "yes" : "no"}
              onChange={(e) => {
                const yes = e.target.value === "yes";
                updateSession({ hasZahnmedizin: yes }, { has_zahnmedizin: yes });
              }}
              className="h-10 w-full border border-input rounded-lg px-2.5 text-sm bg-transparent"
            >
              <option value="no">Nein</option>
              <option value="yes">Ja</option>
            </select>
          </div>
        </div>
      </section>

      {/* ── Auszubildende Buchungen ────────────────────────────────── */}
      <section className="rounded-[10px] bg-card ring-1 ring-black/5 overflow-hidden">
        <div className="px-6 pt-6 pb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            Buchungen Ärzt:innen ({aerztBookings.length})
          </h2>
          <Link
            href="/dashboard/auszubildende/buchungen"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Alle Ärzt:innen-Buchungen →
          </Link>
        </div>
        {aerztBookings.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">
            Noch keine Buchungen für diese Session.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>E-Mail</TableHead>
                <TableHead>Kursart</TableHead>
                <TableHead>Zielgruppe</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Profil</TableHead>
                <TableHead>Gebucht</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aerztBookings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">
                    {[b.firstName, b.lastName].filter(Boolean).join(" ") || "—"}
                  </TableCell>
                  <TableCell className="text-sm">{b.email ?? "—"}</TableCell>
                  <TableCell className="text-sm">{b.courseType ?? "—"}</TableCell>
                  <TableCell className="text-sm">{b.audienceTag ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{b.status ?? "—"}</Badge>
                  </TableCell>
                  <TableCell>
                    {b.profileComplete ? (
                      <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">
                        vollständig
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                        unvollständig
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(b.createdAt), "dd.MM.yyyy", { locale: de })}
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
            Proband:innen ({slots.length} {slots.length === 1 ? "Slot" : "Slots"})
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
                <TableHead>Plätze</TableHead>
                <TableHead>Patient:in</TableHead>
                <TableHead>E-Mail</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notizen</TableHead>
                <TableHead>Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slots.flatMap((slot) => {
                const slotBookings = bookings.filter((b) => b.slot_id === slot.id);
                if (slotBookings.length === 0) {
                  return [
                    <TableRow key={slot.id}>
                      <TableCell className="font-medium">
                        <button onClick={() => openEditSlot(slot)} className="hover:underline">
                          {formatBerlinTime(slot.start_time)}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">{slot.capacity}</TableCell>
                      <TableCell className="text-sm text-muted-foreground italic">Frei</TableCell>
                      <TableCell className="text-sm text-muted-foreground">—</TableCell>
                      <TableCell className="text-sm text-muted-foreground">—</TableCell>
                      <TableCell className="text-sm text-muted-foreground">—</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteSlotId(slot.id)}
                          className="h-8 w-8 p-0"
                          title="Slot löschen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>,
                  ];
                }
                return slotBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      <button onClick={() => openEditSlot(slot)} className="hover:underline">
                        {formatBerlinTime(slot.start_time)}
                      </button>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">{slot.capacity}</TableCell>
                    <TableCell className="font-medium">
                      {[booking.first_name, booking.last_name].filter(Boolean).join(" ") || "—"}
                    </TableCell>
                    <TableCell className="text-sm">{booking.email}</TableCell>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled
                        className="h-8 w-8 p-0"
                        title="Slot mit Buchung kann nicht gelöscht werden"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSlotDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={saveSlot} disabled={!slotTimeInput}>
              Speichern
            </Button>
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
