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
import { ConfirmDialog, AlertDialog } from "@/components/confirm-dialog";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Download, Search } from "lucide-react";
import * as XLSX from "xlsx";

interface Props {
  initialBookings: BookingWithDetails[];
  courses: { id: string; title: string }[];
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

  // No-show confirmation: holds booking + previous status so we can revert on cancel
  const [noShowPending, setNoShowPending] = useState<{
    booking: BookingWithDetails;
    previousStatus: BookingStatus;
  } | null>(null);

  const [alertState, setAlertState] = useState<{ title: string; description: string } | null>(null);

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
    // No-show requires explicit confirmation + automatic charge — show modal instead
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
      // 1. Update status to no_show
      await supabase.from("bookings").update({ status: "no_show" }).eq("id", booking.id);
      setBookings((prev) => prev.map((b) => b.id === booking.id ? { ...b, status: "no_show" } : b));

      // 2. Charge the no-show fee
      const { data, error } = await supabase.functions.invoke("charge-no-show", {
        body: { bookingId: booking.id },
      });

      if (error || data?.error) {
        setAlertState({ title: "Status gesetzt, Zahlung fehlgeschlagen", description: error?.message || data?.error });
      } else {
        setBookings((prev) => prev.map((b) => b.id === booking.id ? { ...b, charge_id: data.chargeId } : b));
        setAlertState({ title: "No-Show bestätigt", description: `50 EUR wurden erfolgreich von ${booking.first_name || booking.name} erhoben.` });
      }
    } catch {
      setAlertState({ title: "Fehler", description: "Ein unerwarteter Fehler ist aufgetreten." });
    } finally {
      setChargingId(null);
    }
  };

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
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Auto-size columns
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
                <SelectValue placeholder="Alle Kurse" />
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      {booking.first_name && booking.last_name
                        ? `${booking.first_name} ${booking.last_name}`
                        : booking.name}
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
