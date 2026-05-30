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
import { Textarea } from "@/components/ui/textarea";
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
import { ArrowLeft, Ban, Calendar, Check, Clock, Copy, GraduationCap, Loader2, Mail, MapPin, Plus, Trash2, User } from "lucide-react";
import { buildProfileCompletionUrl } from "@/lib/profile-link";

export interface DetailSlot {
  id: string;
  start_time: string;
  end_time: string | null;
  capacity: number;
  blocked: boolean;
  blocked_note: string | null;
  // Masseter reservation (migration 117). On a Grundkurs Botulinum
  // course, masseter_eligible slots hold masseter_capacity seats back
  // from general probands for Masseterproband:innen.
  masseter_eligible: boolean;
  masseter_capacity: number;
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
  // Therapeutic indication (plaintext). 'masseter' marks a booking that
  // sits on a reserved masseter seat.
  indication: string | null;
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
  notes: string | null;
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
  // Count of Zahnmediziner:innen booked on this session. Drives the
  // masseter reservation summary + shortfall warning.
  dentistCount: number;
}

const BOOKING_STATUS_OPTIONS: Array<{ value: DetailBooking["status"]; label: string }> = [
  { value: "booked", label: "Gebucht" },
  { value: "attended", label: "Erschienen & Bezahlt" },
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
  dentistCount,
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
  // Masseter reservation (migration 117). Marks a slot as eligible to
  // hold seats back for Masseterproband:innen on a Grundkurs Botulinum.
  const [slotMasseterEligibleInput, setSlotMasseterEligibleInput] = useState(false);
  const [slotMasseterCapacityInput, setSlotMasseterCapacityInput] = useState("0");
  const [deleteSlotId, setDeleteSlotId] = useState<string | null>(null);

  const openAddSlot = () => {
    setEditingSlot(null);
    setSlotTimeInput("");
    setSlotCapacityInput("1");
    setSlotBlockedInput(false);
    setSlotBlockNoteInput("");
    setSlotMasseterEligibleInput(false);
    setSlotMasseterCapacityInput("0");
    setSlotDialogOpen(true);
  };

  const openEditSlot = (slot: DetailSlot) => {
    setEditingSlot(slot);
    setSlotTimeInput(formatBerlinTime(slot.start_time));
    setSlotCapacityInput(String(slot.capacity));
    setSlotBlockedInput(slot.blocked);
    setSlotBlockNoteInput(slot.blocked_note ?? "");
    setSlotMasseterEligibleInput(slot.masseter_eligible);
    setSlotMasseterCapacityInput(String(slot.masseter_capacity));
    setSlotDialogOpen(true);
  };

  // Guard reason for the dialog: masseter_capacity must stay >= the
  // number of masseter bookings already sitting on this slot and <=
  // total capacity. Returns a message string when the current inputs
  // are invalid, otherwise null.
  const masseterGuardError = (() => {
    if (!slotMasseterEligibleInput) return null;
    const capacity = parseInt(slotCapacityInput) || 1;
    const masseter = parseInt(slotMasseterCapacityInput) || 0;
    if (masseter > capacity) {
      return "Reservierte Masseter-Plätze dürfen die Gesamtplätze nicht übersteigen.";
    }
    if (editingSlot) {
      const bookedMasseter = bookings.filter(
        (b) => b.slot_id === editingSlot.id && b.indication === "masseter",
      ).length;
      if (masseter < bookedMasseter) {
        return `Es gibt bereits ${bookedMasseter} Masseter-Buchung${bookedMasseter === 1 ? "" : "en"} auf diesem Slot. Die Reservierung kann nicht darunter liegen.`;
      }
    }
    return null;
  })();

  const saveSlot = async () => {
    if (!satelliteId || !slotTimeInput || masseterGuardError) return;
    const capacity = parseInt(slotCapacityInput) || 1;
    const masseterEligible = slotMasseterEligibleInput;
    const masseterCapacity = masseterEligible
      ? Math.min(parseInt(slotMasseterCapacityInput) || 0, capacity)
      : 0;
    const startTime = buildBerlinTimestamp(session.dateIso, slotTimeInput);
    const blockedNote = slotBlockedInput ? slotBlockNoteInput.trim() || null : null;
    const payload = {
      start_time: startTime,
      capacity,
      blocked: slotBlockedInput,
      blocked_note: blockedNote,
      masseter_eligible: masseterEligible,
      masseter_capacity: masseterCapacity,
    };
    if (editingSlot) {
      await supabase.from("slots").update(payload).eq("id", editingSlot.id);
      setSlots((prev) =>
        prev.map((s) =>
          s.id === editingSlot.id
            ? {
                ...s,
                start_time: startTime,
                capacity,
                blocked: slotBlockedInput,
                blocked_note: blockedNote,
                masseter_eligible: masseterEligible,
                masseter_capacity: masseterCapacity,
              }
            : s,
        ),
      );
    } else {
      const { data } = await supabase
        .from("slots")
        .insert({ course_id: satelliteId, ...payload })
        .select("id")
        .single();
      if (data) {
        setSlots((prev) =>
          [
            ...prev,
            {
              id: data.id as string,
              start_time: startTime,
              end_time: null,
              capacity,
              blocked: slotBlockedInput,
              blocked_note: blockedNote,
              masseter_eligible: masseterEligible,
              masseter_capacity: masseterCapacity,
            },
          ].sort((a, b) => a.start_time.localeCompare(b.start_time)),
        );
      }
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

  const unblockSlot = async (slot: DetailSlot) => {
    await supabase
      .from("slots")
      .update({ blocked: false, blocked_note: null })
      .eq("id", slot.id);
    setSlots((prev) =>
      prev.map((sl) =>
        sl.id === slot.id ? { ...sl, blocked: false, blocked_note: null } : sl,
      ),
    );
    refresh();
  };

  // Stornierungs-Confirm + E-Mail-Versand. Im alten /dashboard/bookings
  // gab es das schon; beim Merge in /dashboard/kurse/[sessionId] ging
  // der ganze Flow verloren — Status flippte still ohne Benachrichtigung
  // an die Proband:in. Hier nachgezogen, identische Logik wie im alten
  // bookings-manager: Confirm-Dialog, E-Mail-Payload VOR dem Update
  // einsammeln, dann update + /api/send-booking-cancellation-email.
  const [cancelPending, setCancelPending] = useState<DetailBooking | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelAlert, setCancelAlert] = useState<{ title: string; description: string } | null>(null);

  const updateBookingStatus = async (booking: DetailBooking, newStatus: DetailBooking["status"]) => {
    // Transition INTO cancelled triggers the email flow + Confirm-Dialog.
    // Re-saves von "cancelled" → "cancelled" laufen still durch.
    if (newStatus === "cancelled" && booking.status !== "cancelled") {
      setCancelPending(booking);
      return;
    }
    setBookings((prev) =>
      prev.map((b) => (b.id === booking.id ? { ...b, status: newStatus } : b)),
    );
    await supabase.from("bookings").update({ status: newStatus }).eq("id", booking.id);
  };

  const handleConfirmCancel = async () => {
    if (!cancelPending) return;
    setCancelling(true);

    // Capture everything the cancellation email needs BEFORE the update.
    // Auch wenn das Status-Update den Datensatz nicht löscht: wir wollen
    // alle Felder einmal sauber zusammenstellen, bevor die Buchung im
    // UI auf "Storniert" steht.
    const slot = slots.find((s) => s.id === cancelPending.slot_id);
    const emailPayload = (() => {
      if (!cancelPending.email || !slot?.start_time) return null;
      const date = new Date(slot.start_time).toLocaleDateString("de-DE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Europe/Berlin",
      });
      const time = new Date(slot.start_time).toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Berlin",
      });
      return {
        email: cancelPending.email,
        firstName: cancelPending.first_name || "",
        courseTitle: session.templateTitle,
        date,
        time,
        location: session.address || "",
      };
    })();

    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", cancelPending.id);
      if (error) {
        setCancelAlert({
          title: "Stornierung fehlgeschlagen",
          description: error.message || "DB-Update konnte nicht gespeichert werden.",
        });
        return;
      }
      setBookings((prev) =>
        prev.map((b) => (b.id === cancelPending.id ? { ...b, status: "cancelled" } : b)),
      );

      // Awaited so we can surface delivery failures. Status ist hier
      // schon geflippt — wenn die E-Mail fehlschlägt, sagen wir dem
      // Admin Bescheid statt einen Resend-Hiccup zu schlucken.
      if (emailPayload) {
        try {
          const emailRes = await fetch("/api/send-booking-cancellation-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(emailPayload),
          });
          if (!emailRes.ok) {
            const data = await emailRes.json().catch(() => ({}));
            setCancelAlert({
              title: "Storniert, aber E-Mail nicht versendet",
              description: `Die Stornierungs-E-Mail an ${emailPayload.email} konnte nicht gesendet werden${data.error ? `: ${data.error}` : "."} Bitte den/die Proband:in manuell informieren.`,
            });
          }
        } catch (err) {
          setCancelAlert({
            title: "Storniert, aber E-Mail nicht versendet",
            description: `Netzwerkfehler beim Senden der Stornierungs-E-Mail an ${emailPayload.email}${err instanceof Error ? `: ${err.message}` : ""}. Bitte den/die Proband:in manuell informieren.`,
          });
        }
      } else if (!cancelPending.email) {
        // Kein Email-Adresse hinterlegt — Admin sollte das wissen.
        setCancelAlert({
          title: "Storniert, keine E-Mail versendet",
          description: "Diese Buchung hat keine E-Mail-Adresse. Bitte den/die Proband:in manuell informieren.",
        });
      }
    } finally {
      setCancelling(false);
      setCancelPending(null);
    }
  };

  const [aerztBookingsState, setAerztBookingsState] = useState<AerztBooking[]>(aerztBookings);
  // Live counter for the section header. Sync to the prop on first
  // render and adjust optimistically on each status transition so the
  // "(X/Y)" badge updates without waiting for a server roundtrip.
  const [aerztBookedSeats, setAerztBookedSeats] = useState<number>(
    session.bookedSeats,
  );

  // Status transitions out of the active set free a seat; transitions
  // back into it consume one. Mirrors the back-office cancellation
  // path which calls these same RPCs.
  const ACTIVE_STATUSES = new Set(["booked", "completed"]);
  const isActive = (s: string | null | undefined) =>
    !!s && ACTIVE_STATUSES.has(s);

  // Aerzt-Stornierung: läuft NICHT direkt über das DB-Update, sondern
  // über /api/cancel-course-booking, weil dort zusätzlich die Stripe-
  // Erstattung (Credit Note bzw. Refund) ausgelöst und die
  // Stornierungs-E-Mail an die Ärzt:in versendet wird. Direkter
  // status='cancelled' im DB würde Refund + Mail komplett überspringen.
  const [aerztCancelPending, setAerztCancelPending] = useState<AerztBooking | null>(null);
  const [aerztCancelling, setAerztCancelling] = useState(false);

  const updateAerztStatus = async (bookingId: string, newStatus: string) => {
    const prevStatus =
      aerztBookingsState.find((b) => b.id === bookingId)?.status ?? null;

    // Übergang nach "Storniert" geht über den API-Refund-Flow.
    // Re-Saves von "cancelled" → "cancelled" laufen hier still durch.
    if (newStatus === "cancelled" && prevStatus !== "cancelled") {
      const booking = aerztBookingsState.find((b) => b.id === bookingId);
      if (booking) {
        setAerztCancelPending(booking);
        return;
      }
    }

    const wasActive = isActive(prevStatus);
    const willBeActive = isActive(newStatus);

    setAerztBookingsState((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b)),
    );
    // Optimistic counter update for the section header.
    if (wasActive && !willBeActive) setAerztBookedSeats((n) => Math.max(n - 1, 0));
    if (!wasActive && willBeActive) setAerztBookedSeats((n) => n + 1);

    await supabase.from("course_bookings").update({ status: newStatus }).eq("id", bookingId);

    // Keep the denormalised course_sessions.booked_seats counter in
    // sync. Without this, the public Auszubildende booking widget on
    // ephia.de still shows the slot as "ausgebucht" after a manual
    // cancel from this dropdown — the widget reads booked_seats, not
    // a derived count. Same RPCs that /api/cancel-course-booking
    // already uses.
    if (wasActive && !willBeActive) {
      await supabase.rpc("decrement_booked_seats", { p_session_id: session.id });
    } else if (!wasActive && willBeActive) {
      await supabase.rpc("increment_booked_seats", { p_session_id: session.id });
    }

    // Cancel any pending review-request email when leaving the active set.
    // The "cancelled" branch above already routed through the cancel-modal
    // → API path which handles this; what's left here is the direct
    // booked → refunded transition.
    if (wasActive && !willBeActive) {
      await fetch(`/api/admin/cancel-review-email/${bookingId}`, { method: "POST" }).catch(() => {});
    }
  };

  const handleConfirmAerztCancel = async () => {
    if (!aerztCancelPending) return;
    setAerztCancelling(true);
    const target = aerztCancelPending;
    try {
      const res = await fetch("/api/cancel-course-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: target.id }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setCancelAlert({
          title: "Stornierung fehlgeschlagen",
          description:
            data?.error ||
            `Die Stornierung konnte nicht durchgeführt werden (HTTP ${res.status}). Die Buchung bleibt unverändert.`,
        });
        return;
      }

      // Optimistic state update: API hat bereits status='cancelled',
      // booked_seats decrement und Mail-Versand erledigt.
      setAerztBookingsState((prev) =>
        prev.map((b) => (b.id === target.id ? { ...b, status: "cancelled" } : b)),
      );
      if (isActive(target.status)) {
        setAerztBookedSeats((n) => Math.max(n - 1, 0));
      }

      // Surface refund + e-mail outcome so admin weiß, ob Ärzt:in
      // benachrichtigt wurde und ob/wo die Stornorechnung liegt.
      const emailFailed = data?.email?.sent === false;
      const emailReason = data?.email?.reason as string | undefined;
      if (emailFailed) {
        const detail =
          emailReason === "no-recipient"
            ? "Keine E-Mail-Adresse hinterlegt."
            : `Versand fehlgeschlagen (${emailReason || "unbekannt"}).`;
        setCancelAlert({
          title: "Storniert, aber E-Mail nicht versendet",
          description: `Die Buchung wurde storniert${data?.refunded ? " und die Zahlung erstattet" : ""}, aber die Bestätigungs-E-Mail an die Ärzt:in konnte nicht versendet werden: ${detail} Bitte manuell informieren.`,
        });
      } else if (data?.refunded && data?.creditNoteUrl) {
        setCancelAlert({
          title: "Storniert + Stornorechnung erstellt",
          description: `Die Buchung wurde storniert und eine Stornorechnung in Stripe erstellt. Link zur Stornorechnung: ${data.creditNoteUrl}`,
        });
      }
    } catch (err) {
      setCancelAlert({
        title: "Stornierung fehlgeschlagen",
        description: `Netzwerkfehler beim Stornieren: ${err instanceof Error ? err.message : "unbekannt"}. Die Buchung bleibt unverändert.`,
      });
    } finally {
      setAerztCancelling(false);
      setAerztCancelPending(null);
    }
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

  const updateAerztNotes = async (booking: AerztBooking, newNotes: string) => {
    const trimmed = newNotes.trim();
    setAerztBookingsState((prev) =>
      prev.map((b) => (b.id === booking.id ? { ...b, notes: trimmed || null } : b)),
    );
    // course_bookings has no E2EE, so we can write the plain column directly.
    await supabase
      .from("course_bookings")
      .update({ notes: trimmed || null })
      .eq("id", booking.id);
  };

  // Click-to-expand popover for Auszubildende notes. The table cell only
  // shows a one-line preview; the full note lives in a Textarea inside a
  // Dialog so longer entries (Schwangerschaft, Vorerkrankungen, …) bleiben
  // gut lesbar without growing every row.
  const [aerztNotesEditing, setAerztNotesEditing] = useState<AerztBooking | null>(null);
  const [aerztNotesDraft, setAerztNotesDraft] = useState("");

  const openAerztNotes = (booking: AerztBooking) => {
    setAerztNotesEditing(booking);
    setAerztNotesDraft(booking.notes ?? "");
  };

  const saveAerztNotes = async () => {
    if (!aerztNotesEditing) return;
    const target = aerztNotesEditing;
    setAerztNotesEditing(null);
    if ((target.notes ?? "") !== aerztNotesDraft) {
      await updateAerztNotes(target, aerztNotesDraft);
    }
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
            Buchungen Ärzt:innen ({aerztBookedSeats}/{session.maxSeats})
          </h2>
          <CreateCampaignButton
            sessionTitle={session.templateTitle}
            dateIso={session.dateIso}
            audienceType="aerztinnen"
            recipientIds={aerztBookingsState
              .map((b) => b.auszubildendeId)
              .filter((id): id is string => Boolean(id))
              .map((id) => `a-${id}`)}
          />
        </div>
        {aerztBookingsState.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">
            Noch keine Buchungen für diese Session.
          </p>
        ) : (
          <Table className="table-fixed">
            {/* Auszubildende table has an extra Notizen column (240px)
                that the Proband:innen table below does not. Other column
                widths still match the Proband:innen <colgroup> so the
                two tables read as a stacked pair. */}
            <colgroup>
              <col style={{ width: "200px" }} />{/* Name */}
              <col style={{ width: "280px" }} />{/* E-Mail */}
              <col style={{ width: "220px" }} />{/* Bereits besuchte Kurse */}
              <col style={{ width: "200px" }} />{/* Spezialisierung */}
              <col style={{ width: "240px" }} />{/* Profil */}
              <col style={{ width: "240px" }} />{/* Notizen */}
              <col style={{ width: "180px" }} />{/* Status */}
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>E-Mail</TableHead>
                <TableHead>Bereits besuchte Kurse</TableHead>
                <TableHead>Spezialisierung</TableHead>
                <TableHead>Profil</TableHead>
                <TableHead>Notizen</TableHead>
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
                  <TableCell className="font-medium truncate" title={fullName}>
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
                  <TableCell
                    className="text-sm truncate"
                    title={b.email ?? undefined}
                  >
                    {b.email ?? "—"}
                  </TableCell>
                  <TableCell
                    className="text-sm truncate"
                    title={
                      b.priorCourses.length === 0
                        ? undefined
                        : b.priorCourses.join(", ")
                    }
                  >
                    {b.priorCourses.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      b.priorCourses.join(", ")
                    )}
                  </TableCell>
                  <TableCell
                    className="text-sm truncate"
                    title={b.specialty ?? undefined}
                  >
                    {b.specialty ?? "—"}
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
                        <SendProfileReminderButton bookingId={b.id} disabled={!b.email} />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => openAerztNotes(b)}
                      className={`w-full text-left text-sm h-9 px-2.5 rounded-lg border border-input bg-transparent hover:bg-muted/50 transition-colors truncate ${
                        b.notes ? "text-foreground" : "text-muted-foreground"
                      }`}
                      title={b.notes ?? "Notizen hinzufügen"}
                    >
                      {b.notes || "Notizen…"}
                    </button>
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

      {/* ── Masseter-Reservierung ───────────────────────────────────── */}
      {(() => {
        const eligibleSlots = slots.filter((s) => s.masseter_eligible);
        // Only surface this panel where masseter reservation is in play:
        // either eligible slots exist, or there are dentists on this
        // session (then staff needs the prompt to set seats up).
        if (eligibleSlots.length === 0 && dentistCount === 0) return null;

        const reservedTotal = eligibleSlots.reduce(
          (sum, s) => sum + s.masseter_capacity,
          0,
        );
        const masseterBooked = bookings.filter(
          (b) => b.indication === "masseter",
        ).length;
        const shortfall = dentistCount - reservedTotal;

        return (
          <section className="rounded-[10px] bg-card ring-1 ring-black/5 overflow-hidden">
            <div className="px-6 pt-6 pb-3">
              <h2 className="text-lg font-semibold">Masseter-Reservierung</h2>
            </div>
            <div className="px-6 pb-6 space-y-3 text-sm">
              <div className="flex flex-wrap gap-x-8 gap-y-2">
                <span>
                  Zahnmediziner:innen auf dieser Session:{" "}
                  <strong>{dentistCount}</strong>
                </span>
                <span>
                  Reservierte Masseter-Plätze: <strong>{reservedTotal}</strong>
                </span>
                <span>
                  Davon gebucht: <strong>{masseterBooked}</strong>
                </span>
              </div>
              {shortfall > 0 ? (
                <div className="rounded-lg bg-amber-50 text-amber-800 px-4 py-3">
                  Es fehlen <strong>{shortfall}</strong> Masseter-Plätze. Es sind{" "}
                  {dentistCount} Zahnmediziner:innen gebucht, aber nur{" "}
                  {reservedTotal} Masseter-Plätze reserviert. Markiere weitere
                  Slots als Masseter-fähig oder erhöhe die reservierten Plätze,
                  damit jede:r Zahnmediziner:in eine:n Masseterproband:in
                  bekommt.
                </div>
              ) : eligibleSlots.length > 0 ? (
                <div className="rounded-lg bg-emerald-50 text-emerald-800 px-4 py-3">
                  Genug Masseter-Plätze reserviert für alle Zahnmediziner:innen
                  auf dieser Session.
                </div>
              ) : (
                <div className="rounded-lg bg-amber-50 text-amber-800 px-4 py-3">
                  Es sind {dentistCount} Zahnmediziner:innen gebucht, aber noch
                  keine Masseter-Plätze reserviert. Öffne einen Proband:innen-Slot
                  und aktiviere &quot;Masseter-Plätze reservieren&quot;.
                </div>
              )}
            </div>
          </section>
        );
      })()}

      {/* ── Proband:innen Slots & Buchungen ─────────────────────────── */}
      <section className="rounded-[10px] bg-card ring-1 ring-black/5 overflow-hidden">
        <div className="px-6 pt-6 pb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            Buchungen Proband:innen ({bookings.length}/{slots.filter((s) => !s.blocked).reduce((sum, sl) => sum + sl.capacity, 0)})
          </h2>
          <div className="flex items-center gap-2">
            <CreateCampaignButton
              sessionTitle={session.templateTitle}
              dateIso={session.dateIso}
              audienceType="probandinnen"
              recipientIds={bookings
                .map((b) => b.patient_id)
                .filter((id): id is string => Boolean(id))
                .map((id) => `p-${id}`)}
            />
            {satelliteId && (
              <Button size="sm" onClick={openAddSlot}>
                <Plus className="h-4 w-4 mr-1" />
                Slot hinzufügen
              </Button>
            )}
          </div>
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
                        <button onClick={() => openEditSlot(slot)} className="hover:underline">
                          {formatBerlinTime(slot.start_time)}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">—</TableCell>{/* Überweiser:in */}
                      <TableCell className="text-sm text-muted-foreground">—</TableCell>{/* Notizen */}
                      <TableCell className="w-[180px]">{/* Aktionen */}
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => unblockSlot(slot)}
                            title="Slot wieder buchbar machen"
                          >
                            Entsperren
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteSlotId(slot.id)}
                            title="Slot löschen"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>,
                  ];
                }
                if (slotBookings.length === 0) {
                  return [
                    <TableRow key={slot.id} className="h-14">
                      <TableCell className="text-sm text-muted-foreground italic">{/* Name */}
                        {slot.masseter_eligible && slot.masseter_capacity > 0 ? (
                          <Badge
                            variant="outline"
                            className="text-[#0066FF] border-[#0066FF]/30 bg-[#0066FF]/5 not-italic font-normal"
                          >
                            Masseter reserviert ({slot.masseter_capacity})
                          </Badge>
                        ) : (
                          "Frei"
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">—</TableCell>{/* E-Mail */}
                      <TableCell className="font-medium">{/* Uhrzeit */}
                        <button onClick={() => openEditSlot(slot)} className="hover:underline">
                          {formatBerlinTime(slot.start_time)}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">—</TableCell>{/* Überweiser:in */}
                      <TableCell className="text-sm text-muted-foreground">—</TableCell>{/* Notizen */}
                      <TableCell className="w-[180px]">{/* Aktionen */}
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditSlot(slot)}
                            title="Slot sperren oder Masseter-Plätze reservieren"
                          >
                            <Ban className="h-4 w-4 mr-1" />
                            Sperren / Masseter
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteSlotId(slot.id)}
                            title="Slot löschen"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
                  <TableRow
                    key={booking.id}
                    data-attended={booking.status === "attended" ? "true" : undefined}
                    className="h-14 data-[attended=true]:bg-[color:var(--soldout-bg)] data-[attended=true]:hover:bg-[color:var(--soldout-bg-hover)]"
                  >
                    <TableCell className="font-medium truncate" title={fullName}>{/* Name */}
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
                    <TableCell className="text-sm truncate" title={booking.email}>
                      {booking.email}
                    </TableCell>{/* E-Mail */}
                    <TableCell className="font-medium">{/* Uhrzeit */}
                      <button onClick={() => openEditSlot(slot)} className="hover:underline">
                        {formatBerlinTime(slot.start_time)}
                      </button>
                    </TableCell>
                    <TableCell
                      className="text-sm truncate"
                      title={booking.referring_doctor ?? undefined}
                    >{/* Überweiser:in */}
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
          {/* min-w-0: the dialog content is a CSS grid, whose items
              default to min-width:auto. Without this the time/number
              inputs push this wrapper past the padded track and overflow
              the modal's right edge. */}
          <div className="space-y-4 py-2 min-w-0">
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
            {/* Sperren + Masseter-Reservierung teilen sich einen
                Trenner, damit der Dialog nicht zwei dicht gestapelte
                Divider zeigt. */}
            <div className="pt-4 border-t space-y-4">
              <div className="space-y-1.5">
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
              {/* Masseter-Reservierung (nur Grundkurs Botulinum). Markiert
                  den Slot als Masseter-fähig und hält Plätze für
                  Masseterproband:innen zurück. Auf 0 setzen gibt den Platz
                  wieder für normale Proband:innen frei. */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={slotMasseterEligibleInput}
                    onChange={(e) => {
                      setSlotMasseterEligibleInput(e.target.checked);
                      if (!e.target.checked) setSlotMasseterCapacityInput("0");
                      else if (slotMasseterCapacityInput === "0")
                        setSlotMasseterCapacityInput("1");
                    }}
                    disabled={slotBlockedInput}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-medium">
                    Masseter-Plätze reservieren
                  </span>
                </label>
                {slotMasseterEligibleInput && (
                  <div className="space-y-1.5 pt-1">
                    <Label>Reservierte Masseter-Plätze</Label>
                    <Input
                      type="number"
                      min={0}
                      value={slotMasseterCapacityInput}
                      onChange={(e) => setSlotMasseterCapacityInput(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Diese Plätze sind für Masseterproband:innen reserviert und
                      werden normalen Proband:innen nicht angeboten. Auf 0 setzen
                      gibt sie wieder frei.
                    </p>
                  </div>
                )}
                {masseterGuardError && (
                  <p className="text-xs text-destructive pt-1">{masseterGuardError}</p>
                )}
              </div>
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
              <Button onClick={saveSlot} disabled={!slotTimeInput || !!masseterGuardError}>
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

      {/* Booking → Storniert: Confirm-Dialog mit E-Mail-Hinweis */}
      <ConfirmDialog
        open={!!cancelPending}
        title="Buchung stornieren"
        description={
          cancelPending
            ? `Die Buchung von ${cancelPending.first_name || cancelPending.email || "diesem/dieser Proband:in"} (${session.templateTitle}) wird auf "Storniert" gesetzt. ${cancelPending.email ? "Der/die Proband:in erhält eine Stornierungs-E-Mail." : "Achtung: Keine E-Mail-Adresse hinterlegt, es wird keine Benachrichtigung versendet."}`
            : ""
        }
        confirmLabel={cancelling ? "Wird storniert..." : "Stornieren & benachrichtigen"}
        onConfirm={handleConfirmCancel}
        onCancel={() => !cancelling && setCancelPending(null)}
      />

      {/* Aerzt-Buchung → Storniert: Stripe-Refund + Mail */}
      <ConfirmDialog
        open={!!aerztCancelPending}
        title="Buchung stornieren"
        description={
          aerztCancelPending
            ? `Die Buchung von ${[aerztCancelPending.firstName, aerztCancelPending.lastName].filter(Boolean).join(" ") || aerztCancelPending.email || "dieser Ärzt:in"} (${session.templateTitle}) wird storniert. Falls eine Zahlung vorliegt, wird sie über Stripe erstattet (bei Rechnungen als Stornorechnung). ${aerztCancelPending.email ? "Die Ärzt:in erhält eine Bestätigungs-E-Mail." : "Achtung: Keine E-Mail-Adresse hinterlegt, es wird keine Benachrichtigung versendet."}`
            : ""
        }
        confirmLabel={aerztCancelling ? "Wird storniert..." : "Stornieren & erstatten"}
        onConfirm={handleConfirmAerztCancel}
        onCancel={() => !aerztCancelling && setAerztCancelPending(null)}
      />

      {/* Hinweis nach Stornierung: E-Mail-Fehler oder fehlende Adresse */}
      <Dialog open={!!cancelAlert} onOpenChange={(open) => !open && setCancelAlert(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{cancelAlert?.title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {cancelAlert?.description}
          </p>
          <DialogFooter>
            <Button onClick={() => setCancelAlert(null)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!aerztNotesEditing}
        onOpenChange={(open) => {
          if (!open) setAerztNotesEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              Notizen
              {aerztNotesEditing
                ? `: ${[aerztNotesEditing.firstName, aerztNotesEditing.lastName]
                    .filter(Boolean)
                    .join(" ") || "Auszubildende:r"}`
                : ""}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            value={aerztNotesDraft}
            onChange={(e) => setAerztNotesDraft(e.target.value)}
            placeholder="z.B. Schwangerschaft, Vorerkrankungen, Sitzplatzwunsch …"
            className="min-h-[180px] text-sm"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAerztNotesEditing(null)}>
              Abbrechen
            </Button>
            <Button onClick={saveAerztNotes}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Small icon button that copies the doctor's profile-completion URL
// onto the clipboard so staff can paste it into ad-hoc messages
// (WhatsApp, Slack, manual emails). Mirrors the URL produced by
// sendProfileReminderEmail so the click-target lands on the same page
// as the automated reminder.
function CopyProfileLinkButton({
  bookingId,
  email,
}: {
  bookingId: string;
  email: string;
}) {
  const [copied, setCopied] = useState(false);
  const disabled = !email;

  const onCopy = async () => {
    if (disabled) return;
    const url = buildProfileCompletionUrl(bookingId, email);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API blocked (e.g. insecure context). Fall back to a
      // hidden textarea + execCommand so staff still gets the URL onto
      // the clipboard without us silently failing.
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } finally {
        ta.remove();
      }
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      disabled={disabled}
      className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground disabled:cursor-not-allowed"
      title={
        disabled
          ? "Keine E-Mail hinterlegt"
          : copied
            ? "Link kopiert"
            : "Profil-Link kopieren"
      }
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
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

// One-click "create a draft campaign for the contacts on this session"
// shortcut. Inserts a row into email_campaigns with the participants
// pre-attached as included_patient_ids in the same "p-<uuid>" /
// "a-<uuid>" form the composer's recipient panel expects, then
// redirects to the composer so the user can fill subject + body.
//
// Used in two places on this page: the Ärzt:innen section
// (audienceType="aerztinnen", recipientIds = a-<auszubildendeId>) and
// the Proband:innen section (audienceType="probandinnen", recipientIds
// = p-<patientId>). Bookings without a linked profile (patient_id /
// auszubildendeId NULL) are silently filtered upstream so we don't
// need to handle them here.
function CreateCampaignButton({
  sessionTitle,
  dateIso,
  audienceType,
  recipientIds,
}: {
  sessionTitle: string;
  dateIso: string;
  audienceType: "aerztinnen" | "probandinnen";
  recipientIds: string[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const disabled = creating || recipientIds.length === 0;
  const label =
    audienceType === "aerztinnen"
      ? "Kampagne an Ärzt:innen"
      : "Kampagne an Proband:innen";
  const emptyTitle =
    audienceType === "aerztinnen"
      ? "Keine Ärzt:innen mit verknüpftem Profil — Kampagne nicht möglich."
      : "Keine Proband:innen mit verknüpftem Profil — Kampagne nicht möglich.";

  const handleCreate = async () => {
    if (disabled) return;
    setCreating(true);
    try {
      const supabase = createClient();
      const dateStr = new Date(dateIso).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      const { data, error } = await supabase
        .from("email_campaigns")
        .insert({
          name: `${sessionTitle} | ${dateStr}`,
          subject: "",
          body_text: "",
          content_blocks: [{ type: "text", text: "" }],
          audience_type: audienceType,
          included_patient_ids: recipientIds,
          excluded_patient_ids: [],
          status: "draft",
          recipient_count: 0,
        })
        .select("id")
        .single();
      if (error || !data) {
        setCreating(false);
        return;
      }
      router.push(`/dashboard/campaigns/${data.id}`);
    } catch {
      setCreating(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleCreate}
      disabled={disabled}
      title={
        recipientIds.length === 0
          ? emptyTitle
          : `${label} mit ${recipientIds.length} Empfänger:in${recipientIds.length === 1 ? "" : "nen"}`
      }
    >
      {creating ? (
        <>
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          Erstelle…
        </>
      ) : (
        <>
          <Mail className="h-4 w-4 mr-1" />
          {label}
        </>
      )}
    </Button>
  );
}
