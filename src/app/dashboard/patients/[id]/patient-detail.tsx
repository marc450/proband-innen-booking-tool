"use client";

import Link from "next/link";
import { Patient, BookingWithDetails, BookingStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ArrowLeft, Mail, Phone, MapPin } from "lucide-react";

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

interface Props {
  patient: Patient;
  bookings: BookingWithDetails[];
}

export function PatientDetail({ patient, bookings }: Props) {
  const fullName = [patient.first_name, patient.last_name].filter(Boolean).join(" ") || patient.email;
  const address = [patient.address_street, [patient.address_zip, patient.address_city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  const totalBookings = bookings.length;
  const attended = bookings.filter((b) => b.status === "attended").length;
  const noShows = bookings.filter((b) => b.status === "no_show").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/patients">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Alle Proband:innen
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Patient info */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl">{fullName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${patient.email}`} className="hover:underline">
                {patient.email}
              </a>
            </div>
            {patient.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${patient.phone}`} className="hover:underline">
                  {patient.phone}
                </a>
              </div>
            )}
            {address && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{address}</span>
              </div>
            )}
            <div className="text-xs text-muted-foreground pt-2">
              Erstellt am {format(new Date(patient.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Statistik</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Buchungen gesamt</span>
              <span className="font-medium">{totalBookings}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Erschienen</span>
              <span className="font-medium text-green-600">{attended}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">No-Shows</span>
              <span className="font-medium text-red-600">{noShows}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Booking history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Buchungsverlauf</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {bookings.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Noch keine Buchungen vorhanden
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kurs</TableHead>
                  <TableHead>Termin</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Gebucht am</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      {booking.slots?.courses?.title || ""}
                    </TableCell>
                    <TableCell>
                      {booking.slots?.start_time
                        ? format(new Date(booking.slots.start_time), "dd.MM.yyyy HH:mm", { locale: de })
                        : ""}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[booking.status]}>
                        {statusLabels[booking.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(booking.created_at), "dd.MM.yyyy", { locale: de })}
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
