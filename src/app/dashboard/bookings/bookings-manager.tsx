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
import { CreditCard, Search } from "lucide-react";

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

  // Confirm & alert state
  const [chargeConfirmBooking, setChargeConfirmBooking] = useState<BookingWithDetails | null>(null);
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
      if (!b.name.toLowerCase().includes(q) && !b.email.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const handleStatusChange = async (bookingId: string, newStatus: BookingStatus) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", bookingId);

    if (!error) {
      setBookings(bookings.map((b) => b.id === bookingId ? { ...b, status: newStatus } : b));
    }
  };

  const handleChargeNoShow = async () => {
    if (!chargeConfirmBooking) return;
    const booking = chargeConfirmBooking;
    setChargeConfirmBooking(null);
    setChargingId(booking.id);

    try {
      const { data, error } = await supabase.functions.invoke("charge-no-show", {
        body: { bookingId: booking.id },
      });

      if (error) {
        setAlertState({ title: "Fehler", description: error.message });
      } else if (data?.error) {
        setAlertState({ title: "Fehler", description: data.error });
      } else {
        setAlertState({ title: "Zahlung erfolgreich", description: `50 EUR wurden erhoben. Charge ID: ${data.chargeId}` });
        setBookings(bookings.map((b) => b.id === booking.id ? { ...b, charge_id: data.chargeId } : b));
      }
    } catch {
      setAlertState({ title: "Fehler", description: "Ein unerwarteter Fehler ist aufgetreten." });
    } finally {
      setChargingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Charge confirm */}
      <ConfirmDialog
        open={!!chargeConfirmBooking}
        title="No-Show-Gebühr erheben"
        description={`50 EUR für ${chargeConfirmBooking?.name} (${chargeConfirmBooking?.email}) wirklich belasten?`}
        confirmLabel="Jetzt belasten"
        variant="destructive"
        onConfirm={handleChargeNoShow}
        onCancel={() => setChargeConfirmBooking(null)}
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
                  <TableHead>Kurs</TableHead>
                  <TableHead>Termin</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">{booking.name}</TableCell>
                    <TableCell>{booking.email}</TableCell>
                    <TableCell>{booking.slots?.courses?.title || "—"}</TableCell>
                    <TableCell>
                      {booking.slots?.start_time
                        ? format(new Date(booking.slots.start_time), "dd.MM.yyyy HH:mm", { locale: de })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={booking.status}
                        onValueChange={(val) => handleStatusChange(booking.id, val as BookingStatus)}
                      >
                        <SelectTrigger className="w-[130px] h-8">
                          <Badge variant={statusVariants[booking.status]}>
                            {statusLabels[booking.status]}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="booked">Gebucht</SelectItem>
                          <SelectItem value="attended">Erschienen</SelectItem>
                          <SelectItem value="no_show">No-Show</SelectItem>
                          <SelectItem value="cancelled">Storniert</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {booking.status === "no_show" && !booking.charge_id && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setChargeConfirmBooking(booking)}
                          disabled={chargingId === booking.id}
                        >
                          <CreditCard className="h-4 w-4 mr-1" />
                          {chargingId === booking.id ? "..." : "50 EUR"}
                        </Button>
                      )}
                      {booking.charge_id && (
                        <Badge variant="outline" className="text-green-600">
                          Belastet
                        </Badge>
                      )}
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
