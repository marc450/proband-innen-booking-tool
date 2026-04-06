"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Save,
  X,
  Calendar,
  Building2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Auszubildende, CourseBookingStatus } from "@/lib/types";

interface BookingRow {
  id: string;
  course_type: string;
  amount_paid: number | null;
  status: CourseBookingStatus;
  created_at: string;
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
  azubi: Auszubildende;
  bookings: BookingRow[];
}

const STATUS_LABELS: Record<string, string> = {
  booked: "Gebucht",
  completed: "Abgeschlossen",
  cancelled: "Storniert",
  refunded: "Erstattet",
};

const STATUS_COLORS: Record<string, string> = {
  booked: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-gray-100 text-gray-500",
};

const COURSE_TYPE_COLORS: Record<string, string> = {
  Onlinekurs: "bg-blue-100 text-blue-700",
  Praxiskurs: "bg-amber-100 text-amber-700",
  Kombikurs: "bg-emerald-100 text-emerald-700",
  Premium: "bg-purple-100 text-purple-700",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function ArztProfile({ azubi: initial, bookings }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [azubi, setAzubi] = useState(initial);
  const [notes, setNotes] = useState(azubi.notes || "");
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  const fullName =
    [azubi.title, azubi.first_name, azubi.last_name].filter(Boolean).join(" ") ||
    azubi.email ||
    "Unbekannt";
  const initials =
    ((azubi.first_name?.[0] || "") + (azubi.last_name?.[0] || "")).toUpperCase() || "?";

  const hasAddress = !!(azubi.address_line1 || azubi.address_postal_code || azubi.address_city);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await supabase
        .from("auszubildende")
        .update({ notes })
        .eq("id", azubi.id);
      setAzubi((prev) => ({ ...prev, notes }));
      setEditingNotes(false);
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="-mx-4 -mt-4">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-[#0066FF]">
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
        {azubi.specialty && (
          <p className="text-sm text-gray-500 mt-0.5">{azubi.specialty}</p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="bg-gray-100 rounded-[10px] py-2">
            <div className="text-lg font-bold text-black">{bookings.length}</div>
            <div className="text-[10px] text-gray-500">Buchungen</div>
          </div>
          <div className="bg-gray-100 rounded-[10px] py-2">
            <div className="text-lg font-bold text-black">
              {azubi.profile_complete ? "Ja" : "Nein"}
            </div>
            <div className="text-[10px] text-gray-500">Profil vollständig</div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Contact info */}
        <div className="bg-white rounded-[10px] p-4 space-y-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            Kontaktinfo
          </h3>
          {azubi.email && (
            <a href={`mailto:${azubi.email}`} className="flex items-center gap-3 text-sm text-black">
              <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="truncate">{azubi.email}</span>
            </a>
          )}
          {azubi.phone && (
            <a href={`tel:${azubi.phone}`} className="flex items-center gap-3 text-sm text-black">
              <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>{azubi.phone}</span>
            </a>
          )}
          {azubi.company_name && (
            <div className="flex items-center gap-3 text-sm text-black">
              <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>{azubi.company_name}</span>
            </div>
          )}
          {hasAddress && (
            <div className="flex items-start gap-3 text-sm text-black">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <span>
                {[
                  azubi.address_line1,
                  [azubi.address_postal_code, azubi.address_city].filter(Boolean).join(" "),
                ]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-[10px] p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Notizen</h3>
            {!editingNotes ? (
              <button onClick={() => setEditingNotes(true)} className="text-xs text-[#0066FF] font-medium">
                Bearbeiten
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditingNotes(false); setNotes(azubi.notes || ""); }}
                  className="p-1 text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
                <button onClick={handleSaveNotes} disabled={savingNotes} className="p-1 text-[#0066FF]">
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
            Kursbuchungen
          </h3>
          {bookings.length === 0 ? (
            <p className="text-sm text-gray-400">Keine Buchungen.</p>
          ) : (
            <div className="space-y-2">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-black truncate">
                      {b.course_templates?.course_label_de || b.course_templates?.title || "Kurs"}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          COURSE_TYPE_COLORS[b.course_type] || "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {b.course_type}
                      </span>
                      {b.course_sessions?.date_iso && (
                        <span className="text-xs text-gray-500 flex items-center gap-0.5">
                          <Calendar className="w-3 h-3" />
                          {formatDate(b.course_sessions.date_iso)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      STATUS_COLORS[b.status] || STATUS_COLORS.booked
                    }`}
                  >
                    {STATUS_LABELS[b.status] || b.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Email action */}
        {azubi.email && (
          <button
            onClick={() =>
              router.push(`/m/inbox?compose=true&to=${encodeURIComponent(azubi.email)}`)
            }
            className="w-full bg-[#0066FF] text-white font-bold text-base py-3 rounded-[10px] flex items-center justify-center gap-2 active:bg-[#0055DD] transition-colors"
          >
            <Mail className="w-4 h-4" />
            E-Mail senden
          </button>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}
