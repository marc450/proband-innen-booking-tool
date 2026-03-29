"use client";

import { useState } from "react";
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
import { FileText } from "lucide-react";
import Link from "next/link";
import type { CourseBookingStatus } from "@/lib/types";

interface BookingRow {
  id: string;
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
  course_sessions: { date_iso: string; label_de: string | null; instructor_name: string | null } | null;
  course_templates: { title: string; course_label_de: string | null } | null;
}

interface Props {
  initialBookings: BookingRow[];
}

const statusLabels: Record<CourseBookingStatus, string> = {
  booked: "Gebucht",
  completed: "Abgeschlossen",
  cancelled: "Storniert",
  refunded: "Erstattet",
};

export function CourseBookingsManager({ initialBookings }: Props) {
  const supabase = createClient();
  const [bookings, setBookings] = useState(initialBookings);
  const [search, setSearch] = useState("");

  const filtered = bookings.filter((b) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      b.first_name?.toLowerCase().includes(s) ||
      b.last_name?.toLowerCase().includes(s) ||
      b.email?.toLowerCase().includes(s)
    );
  });

  const updateStatus = async (id: string, status: CourseBookingStatus) => {
    const { error } = await supabase.from("course_bookings").update({ status }).eq("id", id);
    if (!error) {
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    }
  };

  const formatAmount = (cents: number | null) => {
    if (!cents) return "–";
    return `€${(cents / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kursbuchungen</h1>
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
            <TableHead>Name</TableHead>
            <TableHead>Kurstyp</TableHead>
            <TableHead>Kurs</TableHead>
            <TableHead>Kursdatum</TableHead>
            <TableHead>Kaufdatum</TableHead>
            <TableHead>Betrag</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[60px]">Rechnung</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                {search ? "Keine Buchungen gefunden." : "Noch keine Kursbuchungen vorhanden."}
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((booking) => {
              const name = [booking.first_name, booking.last_name].filter(Boolean).join(" ") || "–";
              return (
                <TableRow key={booking.id}>
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
                    <select
                      value={booking.status}
                      onChange={(e) => updateStatus(booking.id, e.target.value as CourseBookingStatus)}
                      className="text-sm border rounded px-2 py-1"
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    {booking.stripe_invoice_pdf_url ? (
                      <a
                        href={booking.stripe_invoice_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                        title="Rechnung herunterladen"
                      >
                        <FileText className="h-4 w-4" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground/40">–</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
