"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { BookingStatus, BookingWithDetails } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
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
import { Label } from "@/components/ui/label";
import { ConfirmDialog, AlertDialog } from "@/components/confirm-dialog";
import { TableHeaderBar } from "@/components/table/table-header-bar";
import { SortableHead } from "@/components/table/sortable-head";
import { useTableSort } from "@/hooks/use-table-sort";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { parseDateOnly } from "@/lib/date";
import { ArrowLeftRight, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

type BookingWithHash = BookingWithDetails & { email_hash?: string };

interface Props {
  initialBookings: BookingWithHash[];
  courses: { id: string; title: string; treatment_title: string | null; location: string | null; course_date: string | null }[];
  isAdmin?: boolean;
}

interface AvailableSlotOption {
  id: string;
  start_time: string;
  end_time: string;
  remaining_capacity: number;
}

const statusLabels: Record<BookingStatus, string> = {
  booked: "Gebucht",
  attended: "Erschienen",
  no_show: "No-Show",
  cancelled: "Storniert",
};

const statusVariants: Record<BookingStatus, "default" | "secondary" | "destructive" | "outline"> = {
  booked: "default",
  attended: "secondary",
  no_show: "destructive",
  cancelled: "outline",
};

const allStatuses: BookingStatus[] = ["booked", "attended", "no_show", "cancelled"];

type SortKey = "name" | "kurs" | "termin" | "typ" | "arzt" | "status";

function StatusBadgeDropdown({
  booking,
  isAdmin,
  chargingId,
  onStatusChange,
}: {
  booking: BookingWithDetails;
  isAdmin: boolean;
  chargingId: string | null;
  onStatusChange: (bookingId: string, newStatus: BookingStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  // Coords for the portal-rendered menu, recomputed each time it opens
  // and when the page scrolls/resizes. Rendered via createPortal because
  // the bookings table sits inside an overflow-x-auto wrapper that
  // would otherwise clip the dropdown to the row's height.
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Recompute the menu position from the trigger's bounding box. Using
  // viewport-relative coords + position: fixed lets the menu sit on top
  // of the table regardless of overflow / scrolling on parents.
  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setCoords({ top: rect.bottom + 4, left: rect.left });
    };
    reposition();
    // Close on scroll instead of trying to keep the menu glued to the
    // moving trigger — feels closer to native <select> and avoids
    // janky reposition during table scroll.
    const onScroll = () => setOpen(false);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  // Outside-click close: include both the trigger and the menu (the
  // menu lives in a portal, so a single ref is no longer enough).
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const isCharging = chargingId === booking.id;

  if (!isAdmin) {
    return (
      <Badge variant={statusVariants[booking.status]}>
        {statusLabels[booking.status]}
      </Badge>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!isCharging) setOpen((o) => !o);
        }}
        disabled={isCharging}
        className="cursor-pointer disabled:cursor-wait"
      >
        <Badge variant={statusVariants[booking.status]}>
          {isCharging ? "..." : statusLabels[booking.status]}
        </Badge>
      </button>
      {open &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: coords.top, left: coords.left }}
            className="z-50 bg-popover border border-border rounded-md shadow-md py-1 min-w-[130px]"
          >
            {allStatuses.map((s) => (
              <button
                key={s}
                type="button"
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-muted text-left"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  if (s !== booking.status) onStatusChange(booking.id, s);
                }}
              >
                <Badge variant={statusVariants[s]}>{statusLabels[s]}</Badge>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

export function BookingsManager({ initialBookings, courses, isAdmin = true }: Props) {
  const [bookings, setBookings] = useState(initialBookings);
  const [filterCourse, setFilterCourse] = useState<string>("all");
  const [filterDate, setFilterDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [chargingId, setChargingId] = useState<string | null>(null);
  const [deleteBookingPending, setDeleteBookingPending] = useState<BookingWithDetails | null>(null);
  const [cancelPending, setCancelPending] = useState<BookingWithHash | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [deletingBooking, setDeletingBooking] = useState(false);

  // No-show confirmation
  const [noShowPending, setNoShowPending] = useState<{
    booking: BookingWithDetails;
    previousStatus: BookingStatus;
  } | null>(null);

  const [alertState, setAlertState] = useState<{ title: string; description: string } | null>(null);

  // Slot change modal
  const [slotChangePending, setSlotChangePending] = useState<BookingWithHash | null>(null);
  const [slotChangeTargetCourseId, setSlotChangeTargetCourseId] = useState<string>("");
  const [slotChangeTargetSlotId, setSlotChangeTargetSlotId] = useState<string>("");
  const [slotsForCourse, setSlotsForCourse] = useState<AvailableSlotOption[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotChangeError, setSlotChangeError] = useState<string | null>(null);
  const [savingSlotChange, setSavingSlotChange] = useState(false);

  const { sortKey, sortDir, handleSort } = useTableSort<SortKey>("termin", "desc");

  const supabase = createClient();
  const router = useRouter();

  const filteredBookings = bookings.filter((b) => {
    if (filterCourse !== "all" && b.slots?.courses?.title !== courses.find(c => c.id === filterCourse)?.title) {
      return false;
    }
    if (filterDate) {
      const slotDate = format(new Date(b.slots?.start_time), "yyyy-MM-dd");
      if (slotDate !== filterDate) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const fullName = `${b.first_name || ""} ${b.last_name || ""} ${b.name || ""}`.toLowerCase();
      if (!fullName.includes(q) && !b.email.toLowerCase().includes(q) && !(b.phone || "").toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const sortedBookings = useMemo(() => {
    const sorted = [...filteredBookings];
    const dir = sortDir === "asc" ? 1 : -1;

    sorted.sort((a, b) => {
      switch (sortKey) {
        case "name": {
          const nameA = (a.first_name && a.last_name ? `${a.first_name} ${a.last_name}` : a.name || "").toLowerCase();
          const nameB = (b.first_name && b.last_name ? `${b.first_name} ${b.last_name}` : b.name || "").toLowerCase();
          return dir * nameA.localeCompare(nameB, "de");
        }
        case "kurs": {
          const kA = (a.slots?.courses?.title || "").toLowerCase();
          const kB = (b.slots?.courses?.title || "").toLowerCase();
          return dir * kA.localeCompare(kB, "de");
        }
        case "termin": {
          const tA = a.slots?.start_time ? new Date(a.slots.start_time).getTime() : 0;
          const tB = b.slots?.start_time ? new Date(b.slots.start_time).getTime() : 0;
          return dir * (tA - tB);
        }
        case "typ": {
          const typA = a.booking_type || "";
          const typB = b.booking_type || "";
          return dir * typA.localeCompare(typB);
        }
        case "arzt": {
          const aI = (a.slots?.courses?.instructor || "").toLowerCase();
          const bI = (b.slots?.courses?.instructor || "").toLowerCase();
          return dir * aI.localeCompare(bI, "de");
        }
        case "status": {
          return dir * a.status.localeCompare(b.status);
        }
        default:
          return 0;
      }
    });
    return sorted;
  }, [filteredBookings, sortKey, sortDir]);

  const handleStatusChange = async (bookingId: string, newStatus: BookingStatus) => {
    if (newStatus === "no_show") {
      const booking = bookings.find((b) => b.id === bookingId);
      if (booking) {
        setNoShowPending({ booking, previousStatus: booking.status });
      }
      return;
    }

    // Switching to "cancelled" sends the Proband:in a cancellation email.
    // Only email on the transition INTO cancelled (not re-saves) and gate
    // behind a confirmation so an accidental click doesn't notify.
    if (newStatus === "cancelled") {
      const booking = bookings.find((b) => b.id === bookingId);
      if (booking && booking.status !== "cancelled") {
        setCancelPending(booking);
        return;
      }
    }

    const { error } = await supabase
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", bookingId);

    if (!error) {
      setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status: newStatus } : b));
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelPending) return;
    setCancelling(true);

    // Capture everything the cancellation email needs BEFORE the update.
    const emailPayload = (() => {
      const b = cancelPending;
      if (!b.email || !b.slots?.start_time) return null;
      const date = new Date(b.slots.start_time).toLocaleDateString("de-DE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Europe/Berlin",
      });
      const time = new Date(b.slots.start_time).toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Berlin",
      });
      const courseId = b.slots?.course_id;
      const courseLocation = courseId
        ? courses.find((c) => c.id === courseId)?.location || ""
        : "";
      return {
        email: b.email,
        firstName: b.first_name || b.name?.split(" ")[0] || "",
        courseTitle:
          b.slots?.courses?.treatment_title || b.slots?.courses?.title || "",
        date,
        time,
        location: courseLocation,
      };
    })();

    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", cancelPending.id);

      if (!error) {
        setBookings((prev) =>
          prev.map((b) =>
            b.id === cancelPending.id ? { ...b, status: "cancelled" } : b,
          ),
        );
        if (emailPayload) {
          // Best-effort. Fire-and-forget so Resend hiccups don't block.
          fetch("/api/send-booking-cancellation-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(emailPayload),
          }).catch(() => {
            /* swallow — status is already updated */
          });
        }
      }
    } finally {
      setCancelling(false);
      setCancelPending(null);
    }
  };

  const handleConfirmNoShow = async () => {
    if (!noShowPending) return;
    const { booking } = noShowPending;
    setNoShowPending(null);
    setChargingId(booking.id);

    try {
      await supabase.from("bookings").update({ status: "no_show" }).eq("id", booking.id);
      setBookings((prev) => prev.map((b) => b.id === booking.id ? { ...b, status: "no_show" } : b));

      const chargeRes = await fetch("/api/charge-no-show", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const chargeData = await chargeRes.json();

      if (!chargeRes.ok || chargeData.error) {
        setAlertState({ title: "Status gesetzt, Zahlung fehlgeschlagen", description: chargeData.error || "Unbekannter Fehler" });
      } else {
        setBookings((prev) => prev.map((b) => b.id === booking.id ? { ...b, charge_id: chargeData.chargeId } : b));
        setAlertState({ title: "No-Show bestätigt", description: `50,00 EUR wurden erfolgreich von ${booking.first_name || booking.name} erhoben.` });
      }
    } catch {
      setAlertState({ title: "Fehler", description: "Ein unerwarteter Fehler ist aufgetreten." });
    } finally {
      setChargingId(null);
    }
  };

  // --- Slot change handlers ---

  const fetchSlotsForCourse = async (courseId: string, excludeSlotId: string, email: string, emailHash?: string) => {
    setLoadingSlots(true);
    setSlotsForCourse([]);
    setSlotChangeTargetSlotId("");

    // Fetch slots with remaining capacity, excluding the current slot
    const { data: slotData } = await supabase
      .from("available_slots")
      .select("id, start_time, end_time, remaining_capacity")
      .eq("course_id", courseId)
      .gt("remaining_capacity", 0)
      .neq("id", excludeSlotId)
      .order("start_time");

    // Fetch any slots this person is already booked into (for this course)
    const slotIds = (slotData || []).map((s) => s.id);
    let alreadyBookedSlotIds = new Set<string>();
    if (slotIds.length > 0) {
      const lookupField = emailHash ? "email_hash" : "email";
      const lookupValue = emailHash || email;
      const { data: existingBookings } = await supabase
        .from("bookings")
        .select("slot_id")
        .eq(lookupField, lookupValue)
        .in("slot_id", slotIds)
        .in("status", ["booked", "attended"]);
      alreadyBookedSlotIds = new Set((existingBookings || []).map((b) => b.slot_id));
    }

    const filtered = (slotData || []).filter((s) => !alreadyBookedSlotIds.has(s.id));
    setSlotsForCourse(filtered as AvailableSlotOption[]);
    setLoadingSlots(false);
  };

  const handleDeleteBooking = async () => {
    if (!deleteBookingPending) return;
    setDeletingBooking(true);

    // Hard delete only. No cancellation email is sent here — staff use
    // "Status → Storniert" for the communicated-to-Proband:in path.
    const { error } = await supabase
      .from("bookings")
      .delete()
      .eq("id", deleteBookingPending.id);
    if (!error) {
      setBookings((prev) => prev.filter((b) => b.id !== deleteBookingPending.id));
    }
    setDeletingBooking(false);
    setDeleteBookingPending(null);
  };

  const handleOpenSlotChange = (booking: BookingWithHash) => {
    setSlotChangePending(booking);
    setSlotChangeError(null);
    setSlotChangeTargetSlotId("");
    const courseId = booking.slots?.course_id || "";
    setSlotChangeTargetCourseId(courseId);
    if (courseId) {
      fetchSlotsForCourse(courseId, booking.slot_id, booking.email, booking.email_hash);
    }
  };

  const handleSlotChangeCourseSelect = (courseId: string) => {
    setSlotChangeTargetCourseId(courseId);
    setSlotChangeError(null);
    if (slotChangePending) {
      fetchSlotsForCourse(courseId, slotChangePending.slot_id, slotChangePending.email, slotChangePending.email_hash);
    }
  };

  const handleConfirmSlotChange = async () => {
    if (!slotChangePending || !slotChangeTargetSlotId) return;
    setSavingSlotChange(true);
    setSlotChangeError(null);

    try {
      const { error } = await supabase
        .from("bookings")
        .update({ slot_id: slotChangeTargetSlotId })
        .eq("id", slotChangePending.id);

      if (error) {
        setSlotChangeError(error.message);
        return;
      }

      // Update local state
      const newSlot = slotsForCourse.find((s) => s.id === slotChangeTargetSlotId);
      const newCourse = courses.find((c) => c.id === slotChangeTargetCourseId);
      setBookings((prev) =>
        prev.map((b) =>
          b.id === slotChangePending.id
            ? {
                ...b,
                slot_id: slotChangeTargetSlotId,
                slots: {
                  ...b.slots,
                  course_id: slotChangeTargetCourseId,
                  start_time: newSlot?.start_time || b.slots.start_time,
                  end_time: newSlot?.end_time || b.slots.end_time,
                  courses: {
                    title: newCourse?.title || b.slots.courses.title,
                    treatment_title:
                      newCourse?.treatment_title ?? b.slots.courses.treatment_title,
                    instructor: b.slots.courses.instructor,
                  },
                },
              }
            : b
        )
      );

      // Send slot-change notification email (best effort)
      const newSlotForEmail = slotsForCourse.find((s) => s.id === slotChangeTargetSlotId);
      const newCourseForEmail = courses.find((c) => c.id === slotChangeTargetCourseId);
      if (slotChangePending.email && newSlotForEmail) {
        const date = new Date(newSlotForEmail.start_time).toLocaleDateString("de-DE", {
          weekday: "long", day: "numeric", month: "long", year: "numeric",
        });
        const time = new Date(newSlotForEmail.start_time).toLocaleTimeString("de-DE", {
          hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin",
        });
        fetch("/api/send-slot-change-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: slotChangePending.email,
            firstName: slotChangePending.first_name || slotChangePending.name?.split(" ")[0] || "",
            // Prefer the public Behandlungsname over the internal title.
            courseTitle:
              newCourseForEmail?.treatment_title ||
              newCourseForEmail?.title ||
              slotChangePending.slots?.courses?.treatment_title ||
              slotChangePending.slots?.courses?.title ||
              "",
            date,
            time,
            location: newCourseForEmail?.location || "",
            bookingType: slotChangePending.booking_type,
          }),
        });
      }

      setSlotChangePending(null);
      setAlertState({
        title: "Slot geändert",
        description: `Die Buchung wurde erfolgreich auf den neuen Termin umgebucht. Eine E-Mail wurde an ${slotChangePending.email} gesendet.`,
      });
    } finally {
      setSavingSlotChange(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* No-show confirmation modal */}
      <ConfirmDialog
        open={!!noShowPending}
        title="No-Show bestätigen"
        description={`${noShowPending?.booking.first_name || noShowPending?.booking.name} wird als No-Show markiert. Es wird automatisch eine Ausfallgebühr von 50,00 EUR erhoben. Diese Aktion kann nicht rückgängig gemacht werden.`}
        confirmLabel="Bestätigen & 50,00 EUR berechnen"
        variant="destructive"
        onConfirm={handleConfirmNoShow}
        onCancel={() => setNoShowPending(null)}
      />

      {/* Alert */}
      <AlertDialog
        open={!!alertState}
        title={alertState?.title ?? ""}
        description={alertState?.description ?? ""}
        onClose={() => setAlertState(null)}
      />

      {/* Delete booking confirmation */}
      <ConfirmDialog
        open={!!deleteBookingPending}
        title="Buchung löschen"
        description={`Möchtest Du die Buchung von ${deleteBookingPending?.first_name || deleteBookingPending?.name || "diesem/dieser Proband:in"} (${deleteBookingPending?.slots?.courses?.title || ""}) wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden. Achtung: Diese Aktion versendet keine Stornierungs-E-Mail. Für eine Benachrichtigung an den/die Proband:in setze stattdessen den Status auf "Storniert".`}
        confirmLabel={deletingBooking ? "Wird gelöscht..." : "Endgültig löschen"}
        variant="destructive"
        onConfirm={handleDeleteBooking}
        onCancel={() => setDeleteBookingPending(null)}
      />

      {/* Status → Storniert confirmation (triggers the cancellation email) */}
      <ConfirmDialog
        open={!!cancelPending}
        title="Buchung stornieren"
        description={`Die Buchung von ${cancelPending?.first_name || cancelPending?.name || "diesem/dieser Proband:in"} (${cancelPending?.slots?.courses?.title || ""}) wird auf "Storniert" gesetzt. ${cancelPending?.email ? "Der/die Proband:in erhält eine Stornierungs-E-Mail." : "Achtung: Keine E-Mail-Adresse hinterlegt, es wird keine Benachrichtigung versendet."}`}
        confirmLabel={cancelling ? "Wird storniert..." : "Stornieren & benachrichtigen"}
        variant="destructive"
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelPending(null)}
      />

      {/* Slot change modal */}
      <Dialog open={!!slotChangePending} onOpenChange={(open) => { if (!open) setSlotChangePending(null); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Slot ändern</DialogTitle>
          </DialogHeader>

          {slotChangePending && (
            <div className="space-y-4 py-2">
              <div className="rounded-md bg-muted px-4 py-3 text-sm space-y-1">
                <div className="font-medium">
                  {slotChangePending.first_name && slotChangePending.last_name
                    ? `${slotChangePending.first_name} ${slotChangePending.last_name}`
                    : slotChangePending.name}
                </div>
                <div className="text-muted-foreground">
                  Aktuell: {slotChangePending.slots?.courses?.title} —{" "}
                  {format(new Date(slotChangePending.slots.start_time), "dd.MM.yyyy HH:mm", { locale: de })}
                </div>
              </div>

              {(() => {
                // Restrict the course dropdown to courses with the same
                // title as the booking's current course. Staff only ever
                // want to move a patient to a different slot of the same
                // course type, not onto a completely different product.
                const currentCourseTitle = slotChangePending.slots?.courses?.title || "";
                const selectableCourses = currentCourseTitle
                  ? courses.filter((c) => c.title === currentCourseTitle)
                  : courses;
                return (
                  <>
                    <div className="space-y-2">
                      <Label>Kursdatum</Label>
                      <Select value={slotChangeTargetCourseId} onValueChange={(val) => { if (val) handleSlotChangeCourseSelect(val); }}>
                        <SelectTrigger>
                          <span className="truncate">
                            {slotChangeTargetCourseId
                              ? (() => {
                                  const c = selectableCourses.find((c) => c.id === slotChangeTargetCourseId);
                                  if (!c) return slotChangeTargetCourseId;
                                  return c.course_date
                                    ? format(parseDateOnly(c.course_date), "dd.MM.yyyy", { locale: de })
                                    : c.title;
                                })()
                              : "Kursdatum wählen..."}
                          </span>
                        </SelectTrigger>
                        <SelectContent className="w-[--radix-select-trigger-width]">
                          {selectableCourses.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.course_date
                                ? format(parseDateOnly(c.course_date), "dd.MM.yyyy", { locale: de })
                                : c.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Neuer Termin</Label>
                      {loadingSlots ? (
                        <div className="text-sm text-muted-foreground py-2">Lade Termine...</div>
                      ) : slotsForCourse.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-2">
                          {slotChangeTargetCourseId ? "Keine anderen Termine verfügbar." : "Bitte erst ein Kursdatum wählen."}
                        </div>
                      ) : (
                        <Select value={slotChangeTargetSlotId} onValueChange={(val) => { if (val) { setSlotChangeTargetSlotId(val); setSlotChangeError(null); } }}>
                          <SelectTrigger>
                            <span className="truncate">
                              {slotChangeTargetSlotId
                                ? (() => {
                                    const s = slotsForCourse.find((s) => s.id === slotChangeTargetSlotId);
                                    return s
                                      ? `${format(new Date(s.start_time), "HH:mm", { locale: de })} Uhr — ${s.remaining_capacity} Platz${s.remaining_capacity !== 1 ? "ätze" : ""} frei`
                                      : "Termin wählen...";
                                  })()
                                : "Termin wählen..."}
                            </span>
                          </SelectTrigger>
                          <SelectContent className="w-[--radix-select-trigger-width]">
                            {slotsForCourse.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {format(new Date(s.start_time), "HH:mm", { locale: de })} Uhr
                                {" — "}
                                {`${s.remaining_capacity} Platz${s.remaining_capacity !== 1 ? "ätze" : ""} frei`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </>
                );
              })()}

              {slotChangeError && (
                <p className="text-sm text-destructive">{slotChangeError}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSlotChangePending(null)} disabled={savingSlotChange}>
              Abbrechen
            </Button>
            <Button
              onClick={handleConfirmSlotChange}
              disabled={!slotChangeTargetSlotId || savingSlotChange}
            >
              {savingSlotChange ? "Speichern..." : "Slot ändern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TableHeaderBar
        title="Buchungen"
        count={filteredBookings.length}
        countLabel="Buchungen"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Name oder E-Mail..."
        filters={
          <>
            <Select value={filterCourse} onValueChange={(val) => { if (val) setFilterCourse(val); }}>
              <SelectTrigger className="w-[200px] h-9">
                <span className="truncate">
                  {filterCourse === "all"
                    ? "Alle Kurse"
                    : courses.find((c) => c.id === filterCourse)?.title ?? "Alle Kurse"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Kurse</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-[180px] h-9"
            />
            {(filterCourse !== "all" || filterDate || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterCourse("all");
                  setFilterDate("");
                  setSearchQuery("");
                }}
              >
                Filter zurücksetzen
              </Button>
            )}
          </>
        }
      />

      {sortedBookings.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          Keine Buchungen gefunden
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead label="Name" sortKey="name" currentKey={sortKey} direction={sortDir} onSort={handleSort as (key: string) => void} />
                <SortableHead label="Kurs" sortKey="kurs" currentKey={sortKey} direction={sortDir} onSort={handleSort as (key: string) => void} />
                <SortableHead label="Termin" sortKey="termin" currentKey={sortKey} direction={sortDir} onSort={handleSort as (key: string) => void} />
                <SortableHead label="Typ" sortKey="typ" currentKey={sortKey} direction={sortDir} onSort={handleSort as (key: string) => void} />
                <SortableHead label="Ärzt:in" sortKey="arzt" currentKey={sortKey} direction={sortDir} onSort={handleSort as (key: string) => void} />
                <SortableHead label="Status" sortKey="status" currentKey={sortKey} direction={sortDir} onSort={handleSort as (key: string) => void} />
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedBookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {booking.patient_id ? (
                      <button
                        className="text-primary hover:underline text-left"
                        onClick={() => router.push(`/dashboard/patients/${booking.patient_id}`)}
                      >
                        {booking.first_name && booking.last_name
                          ? `${booking.first_name} ${booking.last_name}`
                          : booking.name}
                      </button>
                    ) : (
                      <span>
                        {booking.first_name && booking.last_name
                          ? `${booking.first_name} ${booking.last_name}`
                          : booking.name}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {booking.slots?.courses?.treatment_title ||
                      booking.slots?.courses?.title ||
                      "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {booking.slots?.start_time
                      ? format(new Date(booking.slots.start_time), "dd.MM.yyyy HH:mm", { locale: de })
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {booking.booking_type === "private" ? (
                      <Badge variant="outline" className="text-blue-600 border-blue-300 whitespace-nowrap">
                        Privat
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">Standard</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {booking.slots?.courses?.instructor || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <StatusBadgeDropdown
                        booking={booking}
                        isAdmin={isAdmin}
                        chargingId={chargingId}
                        onStatusChange={handleStatusChange}
                      />
                      {booking.charge_id && (
                        <Badge variant="outline" className="text-green-600 text-xs w-fit">
                          Belastet
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenSlotChange(booking)}
                        title="Slot ändern"
                      >
                        <ArrowLeftRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteBookingPending(booking)}
                        title="Buchung löschen"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
