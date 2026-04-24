"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowLeft,
  MapPin,
  User,
  Clock,
  Users,
  AlertTriangle,
  Stethoscope,
  Building2,
  Sparkles,
  Repeat,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPersonName } from "@/lib/utils";

export interface Participant {
  bookingId: string;
  auszubildendeId: string | null;
  title: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  specialty: string | null;
  gender: string | null;
  companyName: string | null;
  addressCity: string | null;
  notes: string | null;
  contactType: string | null;
  efn: string | null;
  profileComplete: boolean | null;
  courseType: string | null;
  audienceTag: string | null;
  amountPaid: number | null;
  bookingStatus: string;
  createdAt: string;
  priorSessionsCount: number;
}

interface Props {
  sessionId: string;
  templateTitle: string;
  courseLabelDe: string | null;
  dateIso: string;
  labelDe: string | null;
  instructorName: string | null;
  betreuerName: string | null;
  address: string | null;
  startTime: string | null;
  durationMinutes: number | null;
  maxSeats: number;
  bookedSeats: number;
  isLive: boolean;
  cmeStatus: string | null;
  participants: Participant[];
}

const COURSE_TYPE_LABEL: Record<string, string> = {
  Onlinekurs: "Online",
  Praxiskurs: "Praxis",
  Kombikurs: "Kombi",
  Premium: "Premium",
};

const COURSE_TYPE_COLOR: Record<string, string> = {
  Onlinekurs: "bg-sky-100 text-sky-700",
  Praxiskurs: "bg-violet-100 text-violet-700",
  Kombikurs: "bg-amber-100 text-amber-700",
  Premium: "bg-fuchsia-100 text-fuchsia-700",
};

function formatLongDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTime(timeStr: string | null) {
  if (!timeStr) return "";
  if (timeStr.includes("T")) {
    const d = new Date(timeStr);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Berlin",
    });
  }
  return timeStr.slice(0, 5);
}

function topEntries<T extends string>(map: Map<T, number>, limit = 4): Array<[T, number]> {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

export function SessionDetail({
  templateTitle,
  courseLabelDe,
  dateIso,
  labelDe,
  instructorName,
  betreuerName,
  address,
  startTime,
  durationMinutes,
  maxSeats,
  bookedSeats,
  isLive,
  cmeStatus,
  participants,
}: Props) {
  const totalCount = participants.length;

  const stats = useMemo(() => {
    const byCourseType = new Map<string, number>();
    const bySpecialty = new Map<string, number>();
    const byAudience = new Map<string, number>();
    let returningCount = 0;
    let newCount = 0;
    let profileIncomplete = 0;
    let totalRevenue = 0;
    for (const p of participants) {
      if (p.courseType) byCourseType.set(p.courseType, (byCourseType.get(p.courseType) || 0) + 1);
      if (p.specialty?.trim()) {
        const s = p.specialty.trim();
        bySpecialty.set(s, (bySpecialty.get(s) || 0) + 1);
      }
      if (p.audienceTag) byAudience.set(p.audienceTag, (byAudience.get(p.audienceTag) || 0) + 1);
      if (p.priorSessionsCount > 0) returningCount += 1;
      else newCount += 1;
      if (p.auszubildendeId && p.profileComplete === false) profileIncomplete += 1;
      if (p.amountPaid) totalRevenue += p.amountPaid;
    }
    return {
      byCourseType,
      bySpecialty,
      byAudience,
      returningCount,
      newCount,
      profileIncomplete,
      totalRevenue,
    };
  }, [participants]);

  const withNotes = useMemo(
    () => participants.filter((p) => !!p.notes?.trim()),
    [participants],
  );

  const sortedParticipants = useMemo(() => {
    // Group sort: by course type order, then by last name
    const order: Record<string, number> = {
      Premium: 0,
      Kombikurs: 1,
      Praxiskurs: 2,
      Onlinekurs: 3,
    };
    return [...participants].sort((a, b) => {
      const oa = order[a.courseType || ""] ?? 99;
      const ob = order[b.courseType || ""] ?? 99;
      if (oa !== ob) return oa - ob;
      return (a.lastName || "").localeCompare(b.lastName || "");
    });
  }, [participants]);

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/auszubildende"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Zurück zu Kurstermine
      </Link>

      {/* Header */}
      <div className="bg-white rounded-[10px] p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-[11px] font-medium rounded-full px-2 py-0.5 ${
                  isLive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
                }`}
              >
                {isLive ? "Live" : "Offline"}
              </span>
              {cmeStatus && (
                <span className="text-[11px] font-medium rounded-full px-2 py-0.5 bg-blue-100 text-blue-700">
                  CME: {cmeStatus}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold leading-snug">
              {courseLabelDe || templateTitle}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{formatLongDate(dateIso)}</p>
            {labelDe && labelDe !== courseLabelDe && (
              <p className="text-sm text-muted-foreground">{labelDe}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-muted-foreground">
              {instructorName && (
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {instructorName}
                </span>
              )}
              {betreuerName && (
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  Kursbetreuung: {betreuerName}
                </span>
              )}
              {address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {address}
                </span>
              )}
              {startTime && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatTime(startTime)}
                  {durationMinutes ? ` (${durationMinutes} Min)` : ""}
                </span>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-4xl font-bold">
              {bookedSeats}
              <span className="text-xl text-muted-foreground font-normal">
                /{maxSeats}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 justify-end">
              <Users className="w-3 h-3" />
              Plätze belegt
            </div>
          </div>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Repeat className="w-4 h-4" />}
          label="Wiederkehrend"
          value={`${stats.returningCount}`}
          sub={`${stats.newCount} neu bei EPHIA`}
        />
        <StatCard
          icon={<Sparkles className="w-4 h-4" />}
          label="Kurstyp-Mix"
          value={
            stats.byCourseType.size === 0
              ? "—"
              : [...stats.byCourseType.entries()]
                  .map(([k, v]) => `${v} ${COURSE_TYPE_LABEL[k] || k}`)
                  .join(" · ")
          }
        />
        <StatCard
          icon={<Stethoscope className="w-4 h-4" />}
          label="Fachrichtungen"
          value={
            stats.bySpecialty.size === 0
              ? "—"
              : topEntries(stats.bySpecialty, 3)
                  .map(([k, v]) => `${k} (${v})`)
                  .join(", ")
          }
        />
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Vollständige Profile"
          value={`${totalCount - stats.profileIncomplete}/${totalCount}`}
          sub={stats.profileIncomplete > 0 ? `${stats.profileIncomplete} unvollständig` : "Alle bereit für CME"}
          tone={stats.profileIncomplete > 0 ? "warning" : "ok"}
        />
      </div>

      {/* Alerts */}
      {withNotes.length > 0 && (
        <div className="bg-white rounded-[10px] p-4">
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">
                Notizen ({withNotes.length})
              </p>
              <ul className="mt-2 space-y-3">
                {withNotes.map((p) => (
                  <li key={p.bookingId} className="text-sm">
                    <LinkableName
                      participant={p}
                      className="font-semibold hover:underline"
                    />
                    <p className="text-muted-foreground whitespace-pre-wrap mt-0.5 text-xs">
                      {p.notes}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Participants table */}
      <div>
        <h2 className="text-lg font-bold mb-3">
          Teilnehmer:innen ({totalCount})
        </h2>
        {totalCount === 0 ? (
          <div className="bg-white rounded-[10px] p-8 text-center text-sm text-muted-foreground">
            Noch keine Buchungen.
          </div>
        ) : (
          <div className="bg-white rounded-[10px] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Kurstyp</TableHead>
                  <TableHead>Fachrichtung</TableHead>
                  <TableHead>Praxis / Klinik</TableHead>
                  <TableHead>Historie</TableHead>
                  <TableHead>Profil</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedParticipants.map((p) => (
                  <ParticipantRow key={p.bookingId} p={p} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "warning" | "ok";
}) {
  const toneClass =
    tone === "warning"
      ? "bg-amber-50"
      : tone === "ok"
        ? "bg-emerald-50"
        : "bg-white";
  return (
    <div className={`rounded-[10px] p-4 ${toneClass}`}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-lg font-bold leading-tight break-words">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function LinkableName({
  participant,
  className,
}: {
  participant: Participant;
  className?: string;
}) {
  const name =
    formatPersonName({
      title: participant.title,
      firstName: participant.firstName,
      lastName: participant.lastName,
    }) ||
    participant.email ||
    "Unbekannt";
  if (participant.auszubildendeId) {
    return (
      <Link
        href={`/dashboard/auszubildende/personen/${participant.auszubildendeId}`}
        className={className}
      >
        {name}
      </Link>
    );
  }
  return <span className={className}>{name}</span>;
}

function ParticipantRow({ p }: { p: Participant }) {
  const name =
    formatPersonName({
      title: p.title,
      firstName: p.firstName,
      lastName: p.lastName,
    }) ||
    p.email ||
    "Unbekannt";

  const nameCell = p.auszubildendeId ? (
    <Link
      href={`/dashboard/auszubildende/personen/${p.auszubildendeId}`}
      className="font-medium text-primary hover:underline"
    >
      {name}
    </Link>
  ) : (
    <span className="font-medium">{name}</span>
  );

  const courseTypeBadge = p.courseType ? (
    <span
      className={`text-xs font-medium rounded-full px-2 py-0.5 ${
        COURSE_TYPE_COLOR[p.courseType] || "bg-gray-100 text-gray-700"
      }`}
    >
      {COURSE_TYPE_LABEL[p.courseType] || p.courseType}
    </span>
  ) : (
    <span className="text-xs text-muted-foreground">—</span>
  );

  return (
    <TableRow>
      <TableCell>{nameCell}</TableCell>
      <TableCell>{courseTypeBadge}</TableCell>
      <TableCell className="text-sm">
        {p.specialty || <span className="text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className="text-sm">
        {p.companyName ? (
          <span className="flex items-center gap-1">
            <Building2 className="w-3 h-3 text-muted-foreground" />
            {p.companyName}
          </span>
        ) : p.addressCity ? (
          <span className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="w-3 h-3" />
            {p.addressCity}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-sm">
        {p.priorSessionsCount > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">
            <Repeat className="w-3 h-3" />
            {p.priorSessionsCount}× wiederkehrend
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Neu</span>
        )}
      </TableCell>
      <TableCell>
        {p.auszubildendeId == null ? (
          <span className="text-xs text-muted-foreground">Nicht verknüpft</span>
        ) : p.profileComplete === false ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
            <AlertTriangle className="w-3 h-3" />
            Unvollständig
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
            <CheckCircle2 className="w-3 h-3" />
            Vollständig
          </span>
        )}
      </TableCell>
    </TableRow>
  );
}
