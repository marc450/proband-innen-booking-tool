"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Download, ArrowRightLeft, Trash2, Loader2, LinkIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TableHeaderBar } from "@/components/table/table-header-bar";
import { SortableHead } from "@/components/table/sortable-head";
import { useTableSort } from "@/hooks/use-table-sort";
import Link from "next/link";
import { formatPersonName } from "@/lib/utils";
import { buildProfileCompletionUrl } from "@/lib/profile-link";
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
  stripe_invoice_number: string | null;
  profile_complete: boolean | null;
  bundle_group_id: string | null;
  course_sessions: { date_iso: string; label_de: string | null; instructor_name: string | null; start_time: string | null; duration_minutes: number | null; address: string | null } | null;
  course_templates: { title: string; course_label_de: string | null } | null;
  // Current name from the linked auszubildende row, joined at fetch time.
  // Prefer this for display — `first_name`/`last_name` on the booking itself
  // are denormalized snapshots from checkout and do not track profile renames.
  auszubildende: { title: string | null; first_name: string | null; last_name: string | null } | null;
}

// Resolve the display name for a booking: prefer the current auszubildende
// profile name (including title) when a link exists, otherwise fall back to
// the denormalized booking-row snapshot, then to an em-dash.
function displayNameOf(b: Pick<BookingRow, "first_name" | "last_name" | "auszubildende">): string {
  const fromAzubi = b.auszubildende
    ? formatPersonName({
        title: b.auszubildende.title,
        firstName: b.auszubildende.first_name,
        lastName: b.auszubildende.last_name,
      })
    : undefined;
  if (fromAzubi) return fromAzubi;
  const fromBooking = [b.first_name, b.last_name].filter(Boolean).join(" ").trim();
  return fromBooking || "–";
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

type SortKey = "name" | "kurstyp" | "kurs" | "kursdatum" | "kaufdatum" | "betrag" | "status";

const statusLabels: Record<CourseBookingStatus, string> = {
  booked: "Gebucht",
  completed: "Abgeschlossen",
  cancelled: "Storniert",
  refunded: "Erstattet",
};

const statusBadgeVariant: Record<CourseBookingStatus, "default" | "secondary" | "destructive" | "outline"> = {
  booked: "default",
  completed: "secondary",
  cancelled: "destructive",
  refunded: "outline",
};

const statusOrder: CourseBookingStatus[] = ["booked", "completed", "cancelled", "refunded"];

function getSortValue(booking: BookingRow, key: SortKey): string | number {
  switch (key) {
    case "name":
      return displayNameOf(booking).toLowerCase();
    case "kurstyp":
      return booking.course_type.toLowerCase();
    case "kurs":
      return (booking.course_templates?.course_label_de || booking.course_templates?.title || "").toLowerCase();
    case "kursdatum":
      return booking.course_sessions?.date_iso || "";
    case "kaufdatum":
      return booking.created_at;
    case "betrag":
      return booking.amount_paid || 0;
    case "status":
      return statusOrder.indexOf(booking.status);
    default:
      return "";
  }
}

export function CourseBookingsManager({ initialBookings, isAdmin = false }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [bookings, setBookings] = useState(initialBookings);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [invoicePdfUrl, setInvoicePdfUrl] = useState<string | null>(null);

  // Sorting
  const { sortKey, sortDir, handleSort } = useTableSort<SortKey>("kaufdatum", "desc");

  // Session change state
  const [changeBooking, setChangeBooking] = useState<BookingRow | null>(null);
  const [availableSessions, setAvailableSessions] = useState<SessionOption[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [changingSession, setChangingSession] = useState(false);

  // Cancellation state
  // Bundle filter
  const [bundleFilter, setBundleFilter] = useState<string | null>(null);

  // Column filters (one per column) — complement the existing free-text
  // search box which still covers Name + E-Mail.
  const [filterKurstyp, setFilterKurstyp] = useState("");
  const [filterTemplate, setFilterTemplate] = useState("");
  const [filterKursdatumFrom, setFilterKursdatumFrom] = useState("");
  const [filterKaufdatumFrom, setFilterKaufdatumFrom] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const anyFilterActive =
    filterKurstyp || filterTemplate || filterKursdatumFrom || filterKaufdatumFrom || filterStatus;

  const resetColumnFilters = () => {
    setFilterKurstyp("");
    setFilterTemplate("");
    setFilterKursdatumFrom("");
    setFilterKaufdatumFrom("");
    setFilterStatus("");
  };

  const [cancelBooking, setCancelBooking] = useState<BookingRow | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  // Profile link copied feedback
  const [copiedProfileLink, setCopiedProfileLink] = useState<string | null>(null);

  // Status dropdown state
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Close status dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownId(null);
      }
    }
    if (statusDropdownId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [statusDropdownId]);

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
    // Bundle filter
    if (bundleFilter && b.bundle_group_id !== bundleFilter) return false;

    // Per-column filters
    if (filterKurstyp && b.course_type !== filterKurstyp) return false;
    if (filterTemplate && b.template_id !== filterTemplate) return false;
    if (filterStatus && b.status !== filterStatus) return false;
    if (filterKursdatumFrom) {
      const d = b.course_sessions?.date_iso;
      if (!d || d < filterKursdatumFrom) return false;
    }
    if (filterKaufdatumFrom) {
      // created_at is a full timestamp; compare by date prefix.
      if (!b.created_at || b.created_at.slice(0, 10) < filterKaufdatumFrom) return false;
    }

    if (!search.trim()) return true;
    // Token-based match: every whitespace-separated token must appear
    // somewhere in the combined haystack. This lets the user type a
    // full "Vorname Nachname" string (the single-token search used to
    // only match one or the other).
    const haystack = [
      b.first_name,
      b.last_name,
      b.auszubildende?.first_name,
      b.auszubildende?.last_name,
      b.email,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const tokens = search.toLowerCase().trim().split(/\s+/);
    return tokens.every((t) => haystack.includes(t));
  });

  // Sort filtered results
  const sorted = [...filtered].sort((a, b) => {
    const aVal = getSortValue(a, sortKey);
    const bVal = getSortValue(b, sortKey);
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const updateStatus = async (id: string, newStatus: CourseBookingStatus) => {
    const booking = bookings.find((b) => b.id === id);
    if (!booking) return;

    // Intercept cancellation — show confirmation modal instead of direct update
    if (newStatus === "cancelled" && booking.status !== "cancelled" && booking.status !== "refunded") {
      setCancelBooking(booking);
      setCancelError("");
      setStatusDropdownId(null);
      return;
    }

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
    setStatusDropdownId(null);
  };

  const confirmCancellation = async () => {
    if (!cancelBooking) return;
    setCancelling(true);
    setCancelError("");

    try {
      const res = await fetch("/api/cancel-course-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: cancelBooking.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCancelError(data.error || "Fehler bei der Stornierung");
        setCancelling(false);
        return;
      }

      // Update local state
      setBookings((prev) =>
        prev.map((b) => (b.id === cancelBooking.id ? { ...b, status: "cancelled" as CourseBookingStatus } : b))
      );
      setCancelBooking(null);
    } catch {
      setCancelError("Unerwarteter Fehler. Bitte versuche es erneut.");
    } finally {
      setCancelling(false);
    }
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
        firstName: changeBooking.auszubildende?.first_name || changeBooking.first_name,
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
    if (selected.size === sorted.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sorted.map((b) => b.id)));
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

  const sortProps = { currentKey: sortKey, direction: sortDir, onSort: handleSort as (key: string) => void };

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

      <TableHeaderBar
        title="Kursbuchungen"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Name oder E-Mail suchen..."
        filters={
          <>
            {bundleFilter && (
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                onClick={() => setBundleFilter(null)}
              >
                Curriculum-Bundle ✕
              </Badge>
            )}
            {anyFilterActive && (
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 cursor-pointer"
                onClick={resetColumnFilters}
              >
                Filter zurücksetzen ✕
              </Badge>
            )}
            {isAdmin && selected.size > 0 && (
              <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
                <Trash2 className="h-4 w-4 mr-1" />
                {selected.size} löschen
              </Button>
            )}
          </>
        }
      />

      <Table>
        <TableHeader>
          <TableRow>
            {isAdmin && (
              <TableHead className="w-[40px]">
                <input
                  type="checkbox"
                  checked={sorted.length > 0 && selected.size === sorted.length}
                  onChange={toggleSelectAll}
                  className="rounded"
                />
              </TableHead>
            )}
            <SortableHead label="Name" sortKey="name" {...sortProps} />
            <SortableHead label="Kurstyp" sortKey="kurstyp" {...sortProps} />
            <SortableHead label="Kurs" sortKey="kurs" {...sortProps} />
            <SortableHead label="Kursdatum" sortKey="kursdatum" {...sortProps} />
            <SortableHead label="Kaufdatum" sortKey="kaufdatum" {...sortProps} />
            {isAdmin && <SortableHead label="Betrag" sortKey="betrag" {...sortProps} />}
            <SortableHead label="Status" sortKey="status" {...sortProps} />
            {isAdmin && <TableHead className="w-[60px]">Rechnung</TableHead>}
            {isAdmin && <TableHead className="w-[50px]"></TableHead>}
          </TableRow>
          {/* Filter row — one dropdown/input per column. */}
          <TableRow className="hover:bg-transparent">
            {isAdmin && <TableHead className="py-1.5" />}
            <TableHead className="py-1.5" />
            <TableHead className="py-1.5">
              <select
                value={filterKurstyp}
                onChange={(e) => setFilterKurstyp(e.target.value)}
                className="w-full rounded px-1.5 py-1 text-xs bg-gray-100 border-0 cursor-pointer font-normal text-foreground"
              >
                <option value="">Alle</option>
                {Array.from(new Set(bookings.map((b) => b.course_type))).sort().map((ct) => (
                  <option key={ct} value={ct}>{ct === "Premium" ? "Komplettpaket" : ct}</option>
                ))}
              </select>
            </TableHead>
            <TableHead className="py-1.5">
              <select
                value={filterTemplate}
                onChange={(e) => setFilterTemplate(e.target.value)}
                className="w-full rounded px-1.5 py-1 text-xs bg-gray-100 border-0 cursor-pointer font-normal text-foreground"
              >
                <option value="">Alle</option>
                {(() => {
                  const seen = new Map<string, string>();
                  for (const b of bookings) {
                    if (b.template_id && !seen.has(b.template_id)) {
                      seen.set(
                        b.template_id,
                        b.course_templates?.course_label_de ||
                          b.course_templates?.title ||
                          b.template_id,
                      );
                    }
                  }
                  return [...seen.entries()]
                    .sort((a, b) => a[1].localeCompare(b[1], "de"))
                    .map(([id, label]) => (
                      <option key={id} value={id}>{label}</option>
                    ));
                })()}
              </select>
            </TableHead>
            <TableHead className="py-1.5">
              <input
                type="date"
                value={filterKursdatumFrom}
                onChange={(e) => setFilterKursdatumFrom(e.target.value)}
                className="w-full rounded px-1.5 py-1 text-xs bg-gray-100 border-0 font-normal text-foreground"
                title="Ab Kursdatum"
              />
            </TableHead>
            <TableHead className="py-1.5">
              <input
                type="date"
                value={filterKaufdatumFrom}
                onChange={(e) => setFilterKaufdatumFrom(e.target.value)}
                className="w-full rounded px-1.5 py-1 text-xs bg-gray-100 border-0 font-normal text-foreground"
                title="Ab Kaufdatum"
              />
            </TableHead>
            {isAdmin && <TableHead className="py-1.5" />}
            <TableHead className="py-1.5">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full rounded px-1.5 py-1 text-xs bg-gray-100 border-0 cursor-pointer font-normal text-foreground"
              >
                <option value="">Alle</option>
                {statusOrder.map((s) => (
                  <option key={s} value={s}>{statusLabels[s]}</option>
                ))}
              </select>
            </TableHead>
            {isAdmin && <TableHead className="py-1.5" />}
            {isAdmin && <TableHead className="py-1.5" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={isAdmin ? 10 : 7} className="text-center text-muted-foreground py-8">
                {search ? "Keine Buchungen gefunden." : "Noch keine Kursbuchungen vorhanden."}
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((booking) => {
              const name = displayNameOf(booking);
              return (
                <TableRow key={booking.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/auszubildende/buchungen/${booking.id}`)}>
                  {isAdmin && (
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(booking.id)}
                        onChange={() => toggleSelect(booking.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded"
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {booking.auszubildende_id ? (
                        <Link
                          href={`/dashboard/auszubildende/personen/${booking.auszubildende_id}`}
                          className="text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {name}
                        </Link>
                      ) : (
                        name
                      )}
                      {!booking.profile_complete && booking.status === "booked" && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                          Profil unvollständig
                        </span>
                      )}
                      {!booking.profile_complete && booking.status === "booked" && (
                        <button
                          type="button"
                          title="Link zur Profilvervollständigung kopieren"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!booking.email) return;
                            const url = buildProfileCompletionUrl(
                              booking.id,
                              booking.email,
                            );
                            navigator.clipboard.writeText(url);
                            setCopiedProfileLink(booking.id);
                            setTimeout(() => setCopiedProfileLink(null), 2000);
                          }}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 hover:text-amber-900 transition-colors cursor-pointer"
                        >
                          {copiedProfileLink === booking.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <LinkIcon className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="secondary"
                        className={
                          booking.course_type === "Onlinekurs"
                            ? "bg-sky-100 text-sky-700 hover:bg-sky-100"
                            : booking.course_type === "Praxiskurs"
                            ? "bg-amber-100 text-amber-700 hover:bg-amber-100"
                            : booking.course_type === "Kombikurs"
                            ? "bg-violet-100 text-violet-700 hover:bg-violet-100"
                            : ""
                        }
                      >
                        {booking.course_type}
                      </Badge>
                      {booking.bundle_group_id && (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 cursor-pointer text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBundleFilter(
                              bundleFilter === booking.bundle_group_id ? null : booking.bundle_group_id
                            );
                          }}
                        >
                          Curriculum
                        </Badge>
                      )}
                    </div>
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
                  {isAdmin && (
                    <TableCell>{formatAmount(booking.amount_paid)}</TableCell>
                  )}
                  <TableCell>
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <Badge
                        variant={statusBadgeVariant[booking.status]}
                        className={isAdmin && booking.status !== "refunded" ? "cursor-pointer" : ""}
                        onClick={() => {
                          if (isAdmin && booking.status !== "refunded") {
                            setStatusDropdownId(statusDropdownId === booking.id ? null : booking.id);
                          }
                        }}
                      >
                        {statusLabels[booking.status]}
                      </Badge>
                      {isAdmin && booking.status !== "refunded" && statusDropdownId === booking.id && (
                        <div
                          ref={statusDropdownRef}
                          className="absolute z-50 top-full left-0 mt-1 bg-white rounded-lg shadow-lg border py-1 min-w-[140px]"
                        >
                          {statusOrder
                            .filter((s) => s !== "refunded" && s !== booking.status)
                            .map((s) => (
                              <button
                                key={s}
                                className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                                onClick={() => updateStatus(booking.id, s)}
                              >
                                <Badge variant={statusBadgeVariant[s]} className="pointer-events-none">
                                  {statusLabels[s]}
                                </Badge>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      {booking.stripe_invoice_pdf_url ? (
                        <span className="inline-flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setInvoicePdfUrl(booking.stripe_invoice_pdf_url); }}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Rechnung ansehen"
                          >
                            <Search className="h-4 w-4" />
                          </button>
                          <a
                            href={booking.stripe_invoice_pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
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
                  )}
                  {isAdmin && (
                    <TableCell>
                      {booking.session_id && (booking.status === "booked" || booking.status === "completed") && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openSessionChange(booking); }}
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
        <DialogContent className="sm:max-w-[900px] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle>Rechnung</DialogTitle>
              {invoicePdfUrl && (
                <a
                  href={invoicePdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Herunterladen
                </a>
              )}
            </div>
          </DialogHeader>
          {invoicePdfUrl && (
            <iframe
              src={`/api/invoice-pdf?url=${encodeURIComponent(invoicePdfUrl)}#toolbar=0&navpanes=0&view=FitH`}
              className="w-full flex-1 border-0 bg-white"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Cancellation confirmation dialog */}
      <Dialog open={!!cancelBooking} onOpenChange={(open) => { if (!open && !cancelling) setCancelBooking(null); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Buchung stornieren</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm space-y-2">
              <p className="font-semibold text-red-800">Folgende Aktionen werden ausgeführt:</p>
              <ul className="list-disc list-inside text-red-700 space-y-1">
                {cancelBooking?.amount_paid ? (
                  <li>Stripe-Erstattung von {(cancelBooking.amount_paid / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })} € wird ausgelöst</li>
                ) : null}
                {cancelBooking?.amount_paid ? <li>Stornorechnung wird erstellt</li> : null}
                <li>Stornierungsmail wird an {cancelBooking?.email || "Kund:in"} gesendet</li>
                {cancelBooking?.session_id && <li>Platz im Kurs wird freigegeben</li>}
              </ul>
            </div>

            <div className="text-sm">
              <p><strong>Kund:in:</strong> {cancelBooking ? displayNameOf(cancelBooking) : ""}</p>
              <p><strong>Kurs:</strong> {cancelBooking?.course_templates?.course_label_de || cancelBooking?.course_templates?.title || "–"}</p>
              {cancelBooking?.course_sessions?.label_de && (
                <p><strong>Termin:</strong> {cancelBooking.course_sessions.label_de}</p>
              )}
              {cancelBooking?.amount_paid ? (
                <p><strong>Betrag:</strong> {(cancelBooking.amount_paid / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</p>
              ) : null}
            </div>

            {cancelError && <p className="text-red-500 text-sm">{cancelError}</p>}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setCancelBooking(null)}
                disabled={cancelling}
              >
                Abbrechen
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={confirmCancellation}
                disabled={cancelling}
              >
                {cancelling ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Wird storniert...
                  </>
                ) : (
                  "Stornierung bestätigen"
                )}
              </Button>
            </div>
          </div>
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
