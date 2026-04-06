"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { createClient } from "@/lib/supabase/client";
import type { BookingWithDetails, BookingStatus } from "@/lib/types";

interface Props {
  initialBookings: BookingWithDetails[];
  courses: { id: string; title: string }[];
  isAdmin: boolean;
}

const STATUS_OPTIONS = [
  { value: "booked", label: "Gebucht" },
  { value: "attended", label: "Erschienen" },
  { value: "no_show", label: "No-Show" },
  { value: "cancelled", label: "Storniert" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  booked: "bg-blue-100 text-blue-700",
  attended: "bg-emerald-100 text-emerald-700",
  no_show: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  booked: "Gebucht",
  attended: "Erschienen",
  no_show: "No-Show",
  cancelled: "Storniert",
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
  return timeStr?.slice(0, 5) || "";
}

export function BookingsList({ initialBookings, courses, isAdmin }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [bookings, setBookings] = useState(initialBookings);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [statusSheet, setStatusSheet] = useState<string | null>(null);
  const [noShowConfirm, setNoShowConfirm] = useState<string | null>(null);
  const [charging, setCharging] = useState(false);

  const filtered = bookings.filter((b) => {
    if (courseFilter && b.slots?.course_id !== courseFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const name = `${b.first_name || ""} ${b.last_name || ""}`.toLowerCase();
      if (!name.includes(q) && !(b.email?.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  // Group by course date
  const grouped = new Map<string, BookingWithDetails[]>();
  for (const b of filtered) {
    const date = (b.slots?.courses as Record<string, string>)?.course_date || "Unbekannt";
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date)!.push(b);
  }
  const sortedDates = [...grouped.keys()].sort((a, b) => a.localeCompare(b));

  const handleStatusChange = async (bookingId: string, newStatus: BookingStatus) => {
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

      // Charge no-show fee
      await fetch("/api/charge-no-show", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: noShowConfirm }),
      });

      setBookings((prev) =>
        prev.map((b) =>
          b.id === noShowConfirm ? { ...b, status: "no_show" } : b
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

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name oder E-Mail..."
          className="w-full bg-white rounded-[10px] pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#0066FF]/30"
        />
      </div>

      {/* Course filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 no-scrollbar">
        <button
          onClick={() => setCourseFilter("")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${
            !courseFilter
              ? "bg-[#0066FF] text-white"
              : "bg-white text-gray-600"
          }`}
        >
          Alle
        </button>
        {courses.map((c) => (
          <button
            key={c.id}
            onClick={() => setCourseFilter(courseFilter === c.id ? "" : c.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${
              courseFilter === c.id
                ? "bg-[#0066FF] text-white"
                : "bg-white text-gray-600"
            }`}
          >
            {c.title}
          </button>
        ))}
      </div>

      {/* Grouped list */}
      {sortedDates.map((date) => (
        <div key={date} className="mb-5">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 sticky top-0 bg-[#FAEBE1] py-1 z-10">
            {date !== "Unbekannt" ? formatDate(date) : date}
          </div>
          <div className="space-y-2">
            {grouped.get(date)!.map((booking) => {
              const course = booking.slots?.courses;
              const name =
                [booking.first_name, booking.last_name]
                  .filter(Boolean)
                  .join(" ") || booking.email || "Unbekannt";

              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-[10px] p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() =>
                        booking.patient_id
                          ? router.push(`/m/kontakte/${booking.patient_id}`)
                          : null
                      }
                      className="text-left min-w-0 flex-1"
                    >
                      <div className="text-sm font-semibold text-black truncate">
                        {name}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {course?.title || "Kurs"}
                        {booking.slots?.start_time
                          ? ` · ${formatTime(booking.slots.start_time)}`
                          : ""}
                      </div>
                      {booking.booking_type === "private" && (
                        <span className="inline-block mt-1 text-[10px] font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          Privat
                        </span>
                      )}
                    </button>

                    {/* Status chip */}
                    {isAdmin ? (
                      <button
                        onClick={() => setStatusSheet(booking.id)}
                        className={`text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0 ${
                          STATUS_COLORS[booking.status] || STATUS_COLORS.booked
                        }`}
                      >
                        {STATUS_LABELS[booking.status] || booking.status}
                      </button>
                    ) : (
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0 ${
                          STATUS_COLORS[booking.status] || STATUS_COLORS.booked
                        }`}
                      >
                        {STATUS_LABELS[booking.status] || booking.status}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
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
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h3 className="text-sm font-bold text-black mb-3">Status ändern</h3>
            <div className="space-y-2">
              {STATUS_OPTIONS.map(({ value, label }) => {
                const current = bookings.find((b) => b.id === statusSheet);
                const isActive = current?.status === value;
                return (
                  <button
                    key={value}
                    onClick={() => handleStatusChange(statusSheet, value as BookingStatus)}
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
        confirmLabel={charging ? "Wird berechnet..." : "No-Show bestätigen"}
        onConfirm={handleNoShowConfirm}
        variant="destructive"
      />
    </div>
  );
}
