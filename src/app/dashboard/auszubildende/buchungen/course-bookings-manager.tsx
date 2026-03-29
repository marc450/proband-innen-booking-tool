"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Download, ArrowRightLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/confirm-dialog";
import Link from "next/link";
import type { CourseBookingStatus } from "@/lib/types";

interface BookingRow {
  id: string;
  session_id: string | null;
  template_id: string | null;
  course_type: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  amount_paid: number | null;
  status: CourseBookingStatus;
  created_at: string;
  auszubildende_id: string | null;
  stripe_invoice_url: string | null;
  stripe_invoice_pdf_url: string | null;
  course_sessions: { date_iso: string; label_de: string | null; instructor_name: string | null; start_time: string | null; duration_minutes: number | null; address: string | null } | null;
  course_templates: { title: string; course_label_de: string | null } | null;
}

interface SessionOption {
  id: string;
  date_iso: string;
  label_de: string | null;
  start_time: string | null;
  duration_minutes: number | null;
  address: string | null;
  instructor_name: string | null;
  booked_seats: number;
  max_seats: number;
  template_id: string;
}

interface Props {
  initialBookings: BookingRow[];
  isAdmin?: boolean;
}

const statusLabels: Record<CourseBookingStatus, string> = {
  booked: "Gebucht",
  completed: "Abgeschlossen",
  cancelled: "Storniert",
  refunded: "Erstattet",
};

export function CourseBookingsManager({ initialBookings, isAdmin = false }: Props) {
  const supabase = createClient();
  const [bookings, setBookings] = useState(initialBookings);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [invoicePdfUrl, setInvoicePdfUrl] = useState<string | null>(null);

  // Session change state
  const [changeBooking, setChangeBooking] = useState<BookingRow | null>(null);
  const [availableSessions, setAvailableSessions] = useState<SessionOption[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [changingSession, setChangingSession] = useState(false);

  // Auto-complete bookings where the course date has passed
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const toComplete = bookings.filter(
      (b) => b.status === "booked" && b.course_sessions?.date_iso && b.course_sessions.date_iso < today
    );
    if (toComplete.length > 0) {
      const ids = toComplete.map((b) => b.id);
      supabase.from("course_bookings").update({ status: "completed" }).in("id", ids).then(() => {
        setBookings((prev) =>
          prev.map((b) => (ids.includes(b.id) ? { ...b, status: "completed" as CourseBookingStatus } : b))
        );
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = bookings.filter((b) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      b.first_name?.toLowerCase().includes(s) ||
      b.last_name?.toLowerCase().includes(s) ||
      b.email?.toLowerCase().includes(s)
    );
  });

  const updateStatus = async (id: string, newStatus: CourseBookingStatus) => {
    const booking = bookings.find((b) => b.id === id);
    if (!booking) return;

    const oldStatus = booking.status;
    const wasCancelledOrRefunded = oldStatus === "cancelled" || oldStatus === "refunded";
    const isCancellingOrRefunding = newStatus === "cancelled" || newStatus === "refunded";

    const { error } = await supabase.from("course_bookings").update({ status: newStatus }).eq("id", id);
    if (error) return;

    // Free up a seat when cancelling/refunding an active booking
    if (!wasCancelledOrRefunded && isCancellingOrRefunding && booking.session_id) {
      await supabase.rpc("decrement_booked_seats", { p_session_id: booking.session_id });
    }

    // Re-claim a seat when reverting from cancelled/refunded back to active
    if (wasCancelledOrRefunded && !isCancellingOrRefunding && booking.session_id) {
      await supabase.rpc("increment_booked_seats", { p_session_id: booking.session_id });
    }

    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b)));
  };

  const openSessionChange = async (booking: BookingRow) => {
    if (!booking.session_id) return;

    // Fetch available sessions for the same template, excluding current session
    const { data: sessions } = await supabase
      .from("course_sessions")
      .select("id, date_iso, label_de, start_time, duration_minutes, address, instructor_name, booked_seats, max_seats, template_id")
      .eq("template_id", booking.template_id || "")
      .eq("is_live", true)
      .neq("id", booking.session_id)
      .gte("date_iso", new Date().toISOString().slice(0, 10))
      .order("date_iso", { ascending: true });

    const available = (sessions || []).filter((s: SessionOption) => s.booked_seats < s.max_seats);
    setAvailableSessions(available);
    setSelectedSessionId(available[0]?.id || "");
    setChangeBooking(booking);
  };

  const confirmSessionChange = async () => {
    if (!changeBooking || !selectedSessionId || !changeBooking.session_id) return;
    setChangingSession(true);

    const newSession = availableSessions.find((s) => s.id === selectedSessionId);
    if (!newSession) { setChangingSession(false); return; }

    // Update booking to new session
    const { error } = await supabase
      .from("course_bookings")
      .update({ session_id: selectedSessionId })
      .eq("id", changeBooking.id);

    if (error) { setChangingSession(false); return; }

    // Decrement old session, increment new session
    await supabase.rpc("decrement_booked_seats", { p_session_id: changeBooking.session_id });
    await supabase.rpc("increment_booked_seats", { p_session_id: selectedSessionId });

    // Update local state
    setBookings((prev) =>
      prev.map((b) =>
        b.id === changeBooking.id
          ? {
              ...b,
              session_id: selectedSessionId,
              course_sessions: {
                date_iso: newSession.date_iso,
                label_de: newSession.label_de,
                instructor_name: newSession.instructor_name,
                start_time: newSession.start_time,
                duration_minutes: newSession.duration_minutes,
                address: newSession.address,
              },
            }
          : b
      )
    );

    // Send date change email (best effort)
    const courseName = changeBooking.course_templates?.course_label_de || changeBooking.course_templates?.title || "";
    fetch("/api/send-session-change-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: changeBooking.email,
        firstName: changeBooking.first_name,
        courseName,
        dateIso: newSession.date_iso,
        startTime: newSession.start_time,
        durationMinutes: newSession.duration_minutes,
        address: newSession.address,
        instructor: newSession.instructor_name,
      }),
    });

    setChangingSession(false);
    setChangeBooking(null);
  };

  const formatAmount = (cents: number | null) => {
    if (!cents) return "–";
    return `€${(cents / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((b) => b.id)));
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    // Free up seats for active bookings being deleted
    for (const id of ids) {
      const booking = bookings.find((b) => b.id === id);
      if (booking?.session_id && booking.status !== "cancelled" && booking.status !== "refunded") {
        await supabase.rpc("decrement_booked_seats", { p_session_id: booking.session_id });
      }
    }

    const { error } = await supabase.from("course_bookings").delete().in("id", ids);
    if (!error) {
      setBookings((prev) => prev.filter((b) => !ids.includes(b.id)));
      setSelected(new Set());
    }
    setDeleteConfirmOpen(false);
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Buchungen löschen"
        description={`Möchtest Du ${selected.size} Buchung${selected.size > 1 ? "en" : ""} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        confirmLabel="Löschen"
        variant="destructive"
        onConfirm={handleBulkDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Kursbuchungen</h1>
          {isAdmin && selected.size > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
              <Trash2 className="h-4 w-4 mr-1" />
              {selected.size} löschen
            </Button>
          )}
        </div>
        <Input
          placeholder="Name oder E-Mail suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {isAdmin && (
              <TableHead className="w-[40px]">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onChange={toggleSelectAll}
                  className="rounded"
                />
              </TableHead>
            )}
            <TableHead>Name</TableHead>
            <TableHead>Kurstyp</TableHead>
            <TableHead>Kurs</TableHead>
            <TableHead>Kursdatum</TableHead>
            <TableHead>Kaufdatum</TableHead>
            <TableHead>Betrag</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[60px]">Rechnung</TableHead>
            {isAdmin && <TableHead className="w-[50px]"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={isAdmin ? 10 : 9} className="text-center text-muted-foreground py-8">
                {search ? "Keine Buchungen gefunden." : "Noch keine Kursbuchungen vorhanden."}
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((booking) => {
              const name = [booking.first_name, booking.last_name].filter(Boolean).join(" ") || "–";
              return (
                <TableRow key={booking.id}>
                  {isAdmin && (
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(booking.id)}
                        onChange={() => toggleSelect(booking.id)}
                        className="rounded"
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">
                    {booking.auszubildende_id ? (
                      <Link
                        href={`/dashboard/auszubildende/personen/${booking.auszubildende_id}`}
                        className="text-primary hover:underline"
                      >
                        {name}
                      </Link>
                    ) : (
                      name
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{booking.course_type}</Badge>
                  </TableCell>
                  <TableCell>
                    {booking.course_templates?.course_label_de || booking.course_templates?.title || "–"}
                  </TableCell>
                  <TableCell>
                    {booking.course_sessions?.label_de || booking.course_sessions?.date_iso || "–"}
                  </TableCell>
                  <TableCell>
                    {formatDate(booking.created_at)}
                  </TableCell>
                  <TableCell>{formatAmount(booking.amount_paid)}</TableCell>
                  <TableCell>
                    {isAdmin ? (
                      <select
                        value={booking.status}
                        onChange={(e) => updateStatus(booking.id, e.target.value as CourseBookingStatus)}
                        className="text-sm border rounded px-2 py-1"
                      >
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm">{statusLabels[booking.status]}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {booking.stripe_invoice_pdf_url ? (
                      <span className="inline-flex items-center gap-2">
                        <button
                          onClick={() => setInvoicePdfUrl(booking.stripe_invoice_pdf_url)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="Rechnung ansehen"
                        >
                          <Search className="h-4 w-4" />
                        </button>
                        <a
                          href={booking.stripe_invoice_pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="Rechnung herunterladen"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">–</span>
                    )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      {booking.session_id && (booking.status === "booked" || booking.status === "completed") && (
                        <button
                          onClick={() => openSessionChange(booking)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="Termin ändern"
                        >
                          <ArrowRightLeft className="h-4 w-4" />
                        </button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Invoice PDF preview */}
      <Dialog open={!!invoicePdfUrl} onOpenChange={(open) => { if (!open) setInvoicePdfUrl(null); }}>
        <DialogContent className="sm:max-w-[800px] h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Rechnung</DialogTitle>
          </DialogHeader>
          {invoicePdfUrl && (
            <embed
              src={invoicePdfUrl}
              type="application/pdf"
              className="w-full flex-1 rounded"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Session change dialog */}
      <Dialog open={!!changeBooking} onOpenChange={(open) => { if (!open) setChangeBooking(null); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Kurstermin ändern</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Aktueller Termin: <strong>{changeBooking?.course_sessions?.label_de || "–"}</strong>
              {changeBooking?.course_sessions?.start_time && ` um ${changeBooking.course_sessions.start_time} Uhr`}
            </p>

            {availableSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine weiteren verfügbaren Termine für diesen Kurs.</p>
            ) : (
              <>
                <div>
                  <Label>Neuer Termin</Label>
                  <select
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    className="w-full mt-1 border rounded px-3 py-2 text-sm"
                  >
                    {availableSessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label_de || s.date_iso}
                        {s.start_time ? ` – ${s.start_time} Uhr` : ""}
                        {` (${s.booked_seats}/${s.max_seats} Plätze)`}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  onClick={confirmSessionChange}
                  disabled={changingSession || !selectedSessionId}
                  className="w-full"
                >
                  {changingSession ? "Wird geändert..." : "Termin ändern & E-Mail senden"}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
