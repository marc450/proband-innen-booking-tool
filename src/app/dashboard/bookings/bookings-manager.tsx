"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BookingStatus, BookingWithDetails } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ConfirmDialog, AlertDialog } from "@/components/confirm-dialog";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Download, Search, ArrowLeftRight } from "lucide-react";
import * as XLSX from "xlsx";

type BookingWithHash = BookingWithDetails & { email_hash?: string };

interface Props {
  initialBookings: BookingWithHash[];
  courses: { id: string; title: string; location: string | null }[];
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

export function BookingsManager({ initialBookings, courses }: Props) {
  const [bookings, setBookings] = useState(initialBookings);
  const [filterCourse, setFilterCourse] = useState<string>("all");
  const [filterDate, setFilterDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [chargingId, setChargingId] = useState<string | null>(null);

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

  const supabase = createClient();

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

  const handleStatusChange = async (bookingId: string, newStatus: BookingStatus) => {
    if (newStatus === "no_show") {
      const booking = bookings.find((b) => b.id === bookingId);
      if (booking) {
        setNoShowPending({ booking, previousStatus: booking.status });
      }
      return;
    }

    const { error } = await supabase
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", bookingId);

    if (!error) {
      setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status: newStatus } : b));
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
        setAlertState({ title: "No-Show bestätigt", description: `50 EUR wurden erfolgreich von ${booking.first_name || booking.name} erhoben.` });
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
            courseTitle: newCourseForEmail?.title || slotChangePending.slots?.courses?.title || "",
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

  // --- Export ---

  const handleExport = () => {
    const rows = filteredBookings.map((b) => ({
      Vorname: b.first_name || "",
      Nachname: b.last_name || "",
      "E-Mail": b.email,
      Telefon: b.phone || "",
      Kurs: b.slots?.courses?.title || "",
      Datum: b.slots?.start_time
        ? format(new Date(b.slots.start_time), "dd.MM.yyyy", { locale: de })
        : "",
      Uhrzeit: b.slots?.start_time
        ? format(new Date(b.slots.start_time), "HH:mm", { locale: de })
        : "",
      Status: statusLabels[b.status],
      Typ: b.booking_type === "private" ? "Privat" : "Standard",
      "Zuweisende:r Ärzt:in": b.referring_doctor || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    const colWidths = Object.keys(rows[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...rows.map((r) => String((r as Record<string, string>)[key] || "").length)) + 2,
    }));
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Buchungen");

    const courseName = filterCourse !== "all"
      ? courses.find((c) => c.id === filterCourse)?.title || "Buchungen"
      : "Buchungen";
    const dateSuffix = filterDate || format(new Date(), "yyyy-MM-dd");
    const filename = `${courseName}_${dateSuffix}.xlsx`;

    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="space-y-6">
      {/* No-show confirmation modal */}
      <ConfirmDialog
        open={!!noShowPending}
        title="No-Show bestätigen"
        description={`${noShowPending?.booking.first_name || noShowPending?.booking.name} wird als No-Show markiert. Es wird automatisch eine Gebühr von 50 EUR erhoben. Diese Aktion kann nicht rückgängig gemacht werden.`}
        confirmLabel="Bestätigen & 50 EUR berechnen"
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

              <div className="space-y-2">
                <Label>Kurs</Label>
                <Select value={slotChangeTargetCourseId} onValueChange={(val) => { if (val) handleSlotChangeCourseSelect(val); }}>
                  <SelectTrigger>
                    <span className="truncate">
                      {slotChangeTargetCourseId
                        ? courses.find((c) => c.id === slotChangeTargetCourseId)?.title ?? slotChangeTargetCourseId
                        : "Kurs wählen..."}
                    </span>
                  </SelectTrigger>
                  <SelectContent className="w-[--radix-select-trigger-width]">
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title}
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
                    {slotChangeTargetCourseId ? "Keine anderen Termine verfügbar." : "Bitte erst einen Kurs wählen."}
                  </div>
                ) : (
                  <Select value={slotChangeTargetSlotId} onValueChange={(val) => { if (val) { setSlotChangeTargetSlotId(val); setSlotChangeError(null); } }}>
                    <SelectTrigger>
                      <span className="truncate">
                        {slotChangeTargetSlotId
                          ? (() => {
                              const s = slotsForCourse.find((s) => s.id === slotChangeTargetSlotId);
                              return s ? `${format(new Date(s.start_time), "dd.MM.yyyy HH:mm", { locale: de })} — ${s.remaining_capacity} Platz${s.remaining_capacity !== 1 ? "ätze" : ""} frei` : "Termin wählen...";
                            })()
                          : "Termin wählen..."}
                      </span>
                    </SelectTrigger>
                    <SelectContent className="w-[--radix-select-trigger-width]">
                      {slotsForCourse.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {format(new Date(s.start_time), "dd.MM.yyyy HH:mm", { locale: de })}
                          {" — "}
                          {`${s.remaining_capacity} Platz${s.remaining_capacity !== 1 ? "ätze" : ""} frei`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

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

      <h1 className="text-2xl font-bold">Buchungen</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Name oder E-Mail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[200px]"
              />
            </div>
            <Select value={filterCourse} onValueChange={(val) => { if (val) setFilterCourse(val); }}>
              <SelectTrigger className="w-[200px]">
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
              className="w-[180px]"
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
            {filteredBookings.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1" />
                Excel Export
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filteredBookings.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Keine Buchungen gefunden
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Kurs</TableHead>
                  <TableHead>Termin</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Buchungsdatum</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>
                          {booking.first_name && booking.last_name
                            ? `${booking.first_name} ${booking.last_name}`
                            : booking.name}
                        </span>
                        {booking.booking_type === "private" && (
                          <Badge variant="outline" className="text-blue-600 border-blue-300 text-[10px] px-1.5 py-0">
                            Privat
                          </Badge>
                        )}
                      </div>
                      {booking.booking_type === "private" && booking.referring_doctor && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Ärzt:in: {booking.referring_doctor}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{booking.email}</TableCell>
                    <TableCell className="text-sm">{booking.phone || ""}</TableCell>
                    <TableCell>{booking.slots?.courses?.title || "—"}</TableCell>
                    <TableCell>
                      {booking.slots?.start_time
                        ? format(new Date(booking.slots.start_time), "dd.MM.yyyy HH:mm", { locale: de })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Select
                          value={booking.status}
                          onValueChange={(val) => handleStatusChange(booking.id, val as BookingStatus)}
                          disabled={chargingId === booking.id}
                        >
                          <SelectTrigger className="w-[130px] h-8">
                            <Badge variant={statusVariants[booking.status]}>
                              {chargingId === booking.id ? "..." : statusLabels[booking.status]}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="booked">Gebucht</SelectItem>
                            <SelectItem value="attended">Erschienen</SelectItem>
                            <SelectItem value="no_show">No-Show</SelectItem>
                            <SelectItem value="cancelled">Storniert</SelectItem>
                          </SelectContent>
                        </Select>
                        {booking.charge_id && (
                          <Badge variant="outline" className="text-green-600 text-xs w-fit">
                            Belastet
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {booking.created_at
                        ? format(new Date(booking.created_at), "dd.MM.yyyy HH:mm", { locale: de })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenSlotChange(booking)}
                        title="Slot ändern"
                      >
                        <ArrowLeftRight className="h-4 w-4" />
                      </Button>
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
