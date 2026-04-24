"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Calendar, Clock } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { createClient } from "@/lib/supabase/client";
import type { BookingWithDetails, BookingStatus, CourseBookingStatus } from "@/lib/types";

interface CourseBookingRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  course_type: string;
  amount_paid: number | null;
  status: CourseBookingStatus;
  created_at: string;
  auszubildende_id: string | null;
  course_sessions: {
    date_iso: string;
    label_de: string | null;
    instructor_name: string | null;
  } | null;
  course_templates: {
    title: string;
    course_label_de: string | null;
  } | null;
}

interface Props {
  initialBookings: BookingWithDetails[];
  initialCourseBookings: CourseBookingRow[];
  isAdmin: boolean;
}

type Tab = "aerztinnen" | "probandinnen";

const PROBAND_STATUS_OPTIONS: { value: BookingStatus; label: string }[] = [
  { value: "booked", label: "Gebucht" },
  { value: "attended", label: "Erschienen" },
  { value: "no_show", label: "No-Show" },
  { value: "cancelled", label: "Storniert" },
];

const PROBAND_STATUS_COLORS: Record<string, string> = {
  booked: "bg-blue-100 text-blue-700",
  attended: "bg-emerald-100 text-emerald-700",
  no_show: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const PROBAND_STATUS_LABELS: Record<string, string> = {
  booked: "Gebucht",
  attended: "Erschienen",
  no_show: "No-Show",
  cancelled: "Storniert",
};

const COURSE_STATUS_COLORS: Record<string, string> = {
  booked: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-gray-100 text-gray-500",
};

const COURSE_STATUS_LABELS: Record<string, string> = {
  booked: "Gebucht",
  completed: "Abgeschlossen",
  cancelled: "Storniert",
  refunded: "Erstattet",
};

const COURSE_TYPE_COLORS: Record<string, string> = {
  Onlinekurs: "bg-blue-100 text-blue-700",
  Praxiskurs: "bg-amber-100 text-amber-700",
  Kombikurs: "bg-emerald-100 text-emerald-700",
  Premium: "bg-purple-100 text-purple-700",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(timeStr: string) {
  if (!timeStr) return "";
  // slots.start_time is stored as timestamptz and comes back as an ISO
  // string like "2026-05-10T15:30:00+00:00" — parse and render HH:MM.
  // Fall back to a bare "HH:MM" slice for plain time columns.
  const d = new Date(timeStr);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  }
  return timeStr.slice(0, 5);
}

export function BookingsList({
  initialBookings,
  initialCourseBookings,
  isAdmin,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("aerztinnen");
  const [bookings, setBookings] = useState(initialBookings);
  const [search, setSearch] = useState("");
  const [statusSheet, setStatusSheet] = useState<string | null>(null);
  const [noShowConfirm, setNoShowConfirm] = useState<string | null>(null);
  const [charging, setCharging] = useState(false);

  /* ── Proband:innen filtering ── */
  const filteredProband = bookings.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = `${b.first_name || ""} ${b.last_name || ""}`.toLowerCase();
    return name.includes(q) || b.email?.toLowerCase().includes(q);
  });

  // Group by course date
  const probandGrouped = new Map<string, BookingWithDetails[]>();
  for (const b of filteredProband) {
    const date =
      (b.slots?.courses as Record<string, string>)?.course_date || "Unbekannt";
    if (!probandGrouped.has(date)) probandGrouped.set(date, []);
    probandGrouped.get(date)!.push(b);
  }
  const probandDates = [...probandGrouped.keys()].sort((a, b) =>
    a.localeCompare(b)
  );

  /* ── Ärzt:innen filtering ── */
  const filteredCourse = initialCourseBookings.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = `${b.first_name || ""} ${b.last_name || ""}`.toLowerCase();
    return name.includes(q) || b.email?.toLowerCase().includes(q);
  });

  /* ── Proband:innen status change ── */
  const handleStatusChange = async (
    bookingId: string,
    newStatus: BookingStatus
  ) => {
    if (newStatus === "no_show") {
      setNoShowConfirm(bookingId);
      setStatusSheet(null);
      return;
    }
    await supabase
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", bookingId);
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
    );
    setStatusSheet(null);
  };

  const handleNoShowConfirm = async () => {
    if (!noShowConfirm) return;
    setCharging(true);
    try {
      await supabase
        .from("bookings")
        .update({ status: "no_show" })
        .eq("id", noShowConfirm);
      await fetch("/api/charge-no-show", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: noShowConfirm }),
      });
      setBookings((prev) =>
        prev.map((b) =>
          b.id === noShowConfirm ? { ...b, status: "no_show" as BookingStatus } : b
        )
      );
    } finally {
      setCharging(false);
      setNoShowConfirm(null);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-black mb-4">Buchungen</h1>

      {/* Tab toggle */}
      <div className="flex bg-white rounded-[10px] p-1 mb-4">
        <button
          onClick={() => { setTab("aerztinnen"); setSearch(""); }}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
            tab === "aerztinnen"
              ? "bg-[#0066FF] text-white"
              : "text-gray-500"
          }`}
        >
          Ärzt:innen
        </button>
        <button
          onClick={() => { setTab("probandinnen"); setSearch(""); }}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
            tab === "probandinnen"
              ? "bg-[#0066FF] text-white"
              : "text-gray-500"
          }`}
        >
          Proband:innen
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name oder E-Mail..."
          className="w-full bg-white rounded-[10px] pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#0066FF]/30"
        />
      </div>

      {/* ── Ärzt:innen tab ── */}
      {tab === "aerztinnen" && (
        <div className="space-y-2">
          {filteredCourse.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">
              Keine Buchungen gefunden.
            </p>
          )}
          {filteredCourse.map((b) => {
            const name =
              [b.first_name, b.last_name].filter(Boolean).join(" ") ||
              b.email ||
              "Unbekannt";
            return (
              <button
                key={b.id}
                onClick={() =>
                  b.auszubildende_id
                    ? router.push(`/m/kontakte/arzt/${b.auszubildende_id}`)
                    : undefined
                }
                className="w-full bg-white rounded-[10px] p-4 text-left active:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-black truncate">
                      {name}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {b.course_templates?.course_label_de ||
                        b.course_templates?.title ||
                        "Kurs"}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          COURSE_TYPE_COLORS[b.course_type] ||
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {b.course_type}
                      </span>
                      {b.course_sessions?.date_iso && (
                        <span className="text-xs text-gray-400 flex items-center gap-0.5">
                          <Calendar className="w-3 h-3" />
                          {formatDate(b.course_sessions.date_iso)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0 ${
                      COURSE_STATUS_COLORS[b.status] ||
                      COURSE_STATUS_COLORS.booked
                    }`}
                  >
                    {COURSE_STATUS_LABELS[b.status] || b.status}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Proband:innen tab ── */}
      {tab === "probandinnen" && (
        <>
          {probandDates.map((date) => (
            <div key={date} className="mb-5">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 sticky top-0 bg-[#F5F5F5] py-1 z-10">
                {date !== "Unbekannt" ? formatDate(date) : date}
              </div>
              <div className="space-y-2">
                {probandGrouped.get(date)!.map((booking) => {
                  const course = booking.slots?.courses;
                  const name =
                    [booking.first_name, booking.last_name]
                      .filter(Boolean)
                      .join(" ") ||
                    booking.email ||
                    "Unbekannt";
                  return (
                    <div key={booking.id} className="bg-white rounded-[10px] p-4">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          onClick={() =>
                            booking.patient_id
                              ? router.push(`/m/kontakte/${booking.patient_id}`)
                              : undefined
                          }
                          className="text-left min-w-0 flex-1"
                        >
                          <div className="text-sm font-semibold text-black truncate">
                            {name}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {course?.title || "Kurs"}
                          </div>
                          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                            {booking.slots?.start_time && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-50 text-[#0066FF] px-2 py-0.5 rounded-full">
                                <Clock className="w-3 h-3" />
                                {formatTime(booking.slots.start_time)} Uhr
                              </span>
                            )}
                            {booking.booking_type === "private" && (
                              <span className="inline-flex items-center text-[10px] font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                Privat
                              </span>
                            )}
                          </div>
                        </button>
                        {isAdmin ? (
                          <button
                            onClick={() => setStatusSheet(booking.id)}
                            className={`text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0 ${
                              PROBAND_STATUS_COLORS[booking.status] ||
                              PROBAND_STATUS_COLORS.booked
                            }`}
                          >
                            {PROBAND_STATUS_LABELS[booking.status] ||
                              booking.status}
                          </button>
                        ) : (
                          <span
                            className={`text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0 ${
                              PROBAND_STATUS_COLORS[booking.status] ||
                              PROBAND_STATUS_COLORS.booked
                            }`}
                          >
                            {PROBAND_STATUS_LABELS[booking.status] ||
                              booking.status}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredProband.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">
              Keine Buchungen gefunden.
            </p>
          )}

          {/* Status bottom sheet */}
          {statusSheet && (
            <div
              className="fixed inset-0 z-50 bg-black/40"
              onClick={() => setStatusSheet(null)}
            >
              <div
                className="absolute bottom-0 inset-x-0 bg-white rounded-t-2xl p-4"
                style={{
                  paddingBottom:
                    "calc(env(safe-area-inset-bottom, 0px) + 16px)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
                <h3 className="text-sm font-bold text-black mb-3">
                  Status ändern
                </h3>
                <div className="space-y-2">
                  {PROBAND_STATUS_OPTIONS.map(({ value, label }) => {
                    const current = bookings.find(
                      (b) => b.id === statusSheet
                    );
                    const isActive = current?.status === value;
                    return (
                      <button
                        key={value}
                        onClick={() =>
                          handleStatusChange(statusSheet, value)
                        }
                        className={`w-full text-left px-4 py-3 rounded-[10px] text-sm font-semibold transition-colors ${
                          isActive
                            ? "bg-[#0066FF] text-white"
                            : "bg-gray-50 text-black active:bg-gray-100"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* No-show charge confirmation */}
          <ConfirmDialog
            open={!!noShowConfirm}
            onCancel={() => setNoShowConfirm(null)}
            title="No-Show markieren"
            description="Die Buchung wird als No-Show markiert und eine Gebühr von EUR 50 wird berechnet."
            confirmLabel={
              charging ? "Wird berechnet..." : "No-Show bestätigen"
            }
            onConfirm={handleNoShowConfirm}
            variant="destructive"
          />
        </>
      )}
    </div>
  );
}
