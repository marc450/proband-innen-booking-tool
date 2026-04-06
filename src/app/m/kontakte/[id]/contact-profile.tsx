"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  FileText,
  Save,
  X,
  Calendar,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Patient, BookingWithDetails } from "@/lib/types";

interface Props {
  patient: Patient;
  bookings: BookingWithDetails[];
  isAdmin: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  active: "Aktiv",
  warning: "Warnung",
  blacklist: "Blacklist",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  blacklist: "bg-red-100 text-red-700",
};

const BOOKING_STATUS_LABELS: Record<string, string> = {
  booked: "Gebucht",
  attended: "Erschienen",
  no_show: "No-Show",
  cancelled: "Storniert",
};

const BOOKING_STATUS_COLORS: Record<string, string> = {
  booked: "bg-blue-100 text-blue-700",
  attended: "bg-emerald-100 text-emerald-700",
  no_show: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(timeStr: string) {
  return timeStr?.slice(0, 5) || "";
}

export function ContactProfile({ patient, bookings, isAdmin }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [notes, setNotes] = useState(patient.notes || "");
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [status, setStatus] = useState<string>(patient.patient_status || "active");

  const initials =
    ((patient.first_name?.[0] || "") + (patient.last_name?.[0] || "")).toUpperCase() || "?";
  const fullName =
    [patient.first_name, patient.last_name].filter(Boolean).join(" ") || "Unbekannt";

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus);
    await supabase
      .from("patients")
      .update({ patient_status: newStatus })
      .eq("id", patient.id);
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await fetch("/api/update-patient-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: patient.id, notes }),
      });
      setEditingNotes(false);
    } finally {
      setSavingNotes(false);
    }
  };

  const attendedCount = bookings.filter((b) => b.status === "attended").length;
  const noShowCount = bookings.filter((b) => b.status === "no_show").length;

  return (
    <div className="-mx-4 -mt-4">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button
          onClick={() => router.back()}
          className="p-1 -ml-1 text-[#0066FF]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold text-black">Kontakte</span>
      </div>

      {/* Profile card */}
      <div className="bg-white px-4 py-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[#0066FF]/10 flex items-center justify-center mx-auto mb-3">
          <span className="text-xl font-bold text-[#0066FF]">{initials}</span>
        </div>
        <h2 className="text-lg font-bold text-black">{fullName}</h2>
        {patient.email && (
          <p className="text-sm text-gray-500 mt-0.5">{patient.email}</p>
        )}

        {/* Status */}
        <div className="mt-3 flex justify-center">
          {isAdmin ? (
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`text-xs font-semibold px-3 py-1 rounded-full border-0 appearance-none cursor-pointer ${
                STATUS_COLORS[status] || STATUS_COLORS.active
              }`}
            >
              <option value="active">Aktiv</option>
              <option value="warning">Warnung</option>
              <option value="blacklist">Blacklist</option>
            </select>
          ) : (
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full ${
                STATUS_COLORS[status] || STATUS_COLORS.active
              }`}
            >
              {STATUS_LABELS[status] || status}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="bg-gray-100 rounded-[10px] py-2">
            <div className="text-lg font-bold text-black">{bookings.length}</div>
            <div className="text-[10px] text-gray-500">Buchungen</div>
          </div>
          <div className="bg-gray-100 rounded-[10px] py-2">
            <div className="text-lg font-bold text-emerald-600">{attendedCount}</div>
            <div className="text-[10px] text-gray-500">Erschienen</div>
          </div>
          <div className="bg-gray-100 rounded-[10px] py-2">
            <div className="text-lg font-bold text-red-600">{noShowCount}</div>
            <div className="text-[10px] text-gray-500">No-Show</div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Contact info */}
        <div className="bg-white rounded-[10px] p-4 space-y-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            Kontaktinfo
          </h3>
          {patient.email && (
            <a
              href={`mailto:${patient.email}`}
              className="flex items-center gap-3 text-sm text-black"
            >
              <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="truncate">{patient.email}</span>
            </a>
          )}
          {patient.phone && (
            <a
              href={`tel:${patient.phone}`}
              className="flex items-center gap-3 text-sm text-black"
            >
              <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>{patient.phone}</span>
            </a>
          )}
          {(patient.address_street || patient.address_zip || patient.address_city) && (
            <div className="flex items-start gap-3 text-sm text-black">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <span>
                {[patient.address_street, [patient.address_zip, patient.address_city].filter(Boolean).join(" ")]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-[10px] p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Notizen
            </h3>
            {!editingNotes ? (
              <button
                onClick={() => setEditingNotes(true)}
                className="text-xs text-[#0066FF] font-medium"
              >
                Bearbeiten
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingNotes(false);
                    setNotes(patient.notes || "");
                  }}
                  className="p-1 text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="p-1 text-[#0066FF]"
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          {editingNotes ? (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full text-sm bg-gray-50 rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#0066FF]/30 resize-none"
              autoFocus
            />
          ) : (
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {notes || "Keine Notizen."}
            </p>
          )}
        </div>

        {/* Bookings */}
        <div className="bg-white rounded-[10px] p-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
            Buchungen
          </h3>
          {bookings.length === 0 ? (
            <p className="text-sm text-gray-400">Keine Buchungen.</p>
          ) : (
            <div className="space-y-2">
              {bookings.map((booking) => {
                const course = booking.slots?.courses;
                return (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-black truncate">
                        {course?.title || "Kurs"}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {booking.slots?.start_time
                          ? formatTime(booking.slots.start_time)
                          : ""}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        BOOKING_STATUS_COLORS[booking.status] ||
                        BOOKING_STATUS_COLORS.booked
                      }`}
                    >
                      {BOOKING_STATUS_LABELS[booking.status] || booking.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action: send email */}
        {patient.email && (
          <button
            onClick={() =>
              router.push(
                `/m/inbox?compose=true&to=${encodeURIComponent(patient.email!)}`
              )
            }
            className="w-full bg-[#0066FF] text-white font-bold text-base py-3 rounded-[10px] flex items-center justify-center gap-2 active:bg-[#0055DD] transition-colors"
          >
            <Mail className="w-4 h-4" />
            E-Mail senden
          </button>
        )}

        {/* Spacer for tab bar */}
        <div className="h-4" />
      </div>
    </div>
  );
}
