"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowLeft,
  MapPin,
  User,
  Clock,
  Users,
  ChevronRight,
  AlertTriangle,
  Stethoscope,
  Building2,
  Sparkles,
  Repeat,
  FileText,
} from "lucide-react";
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
  address: string | null;
  startTime: string | null;
  durationMinutes: number | null;
  maxSeats: number;
  bookedSeats: number;
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

function topEntries<T extends string>(map: Map<T, number>, limit = 3): Array<[T, number]> {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

export function SessionDetail({
  templateTitle,
  courseLabelDe,
  dateIso,
  labelDe,
  instructorName,
  address,
  startTime,
  durationMinutes,
  maxSeats,
  bookedSeats,
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
    let humanMed = 0;
    let zahnMed = 0;
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
      if (p.contactType === "auszubildende" || p.audienceTag === "humanmediziner") humanMed += 1;
      if (p.contactType === "zahnmediziner" || p.audienceTag === "zahnmediziner") zahnMed += 1;
    }
    return { byCourseType, bySpecialty, byAudience, returningCount, newCount, profileIncomplete, humanMed, zahnMed };
  }, [participants]);

  const grouped = useMemo(() => {
    const map = new Map<string, Participant[]>();
    for (const p of participants) {
      const key = p.courseType || "—";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    // Stable, predictable order
    const order = ["Premium", "Kombikurs", "Praxiskurs", "Onlinekurs", "—"];
    return order
      .filter((k) => map.has(k))
      .map((k) => [k, map.get(k)!] as const);
  }, [participants]);

  const withNotes = useMemo(
    () => participants.filter((p) => !!p.notes?.trim()),
    [participants],
  );

  const incomplete = useMemo(
    () => participants.filter((p) => p.auszubildendeId && p.profileComplete === false),
    [participants],
  );

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-3">
        <Link
          href="/m/termine"
          className="inline-flex items-center gap-1 text-sm text-gray-600 active:text-black"
        >
          <ArrowLeft className="w-4 h-4" />
          Termine
        </Link>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-[10px] p-4 mb-4">
        <h1 className="text-lg font-bold text-black leading-snug">
          {courseLabelDe || templateTitle}
        </h1>
        <p className="text-xs text-gray-500 mt-1">{formatLongDate(dateIso)}</p>
        {labelDe && <p className="text-xs text-gray-500">{labelDe}</p>}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
          {instructorName && (
            <span className="text-xs text-gray-600 flex items-center gap-1">
              <User className="w-3 h-3" />
              {instructorName}
            </span>
          )}
          {address && (
            <span className="text-xs text-gray-600 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {address}
            </span>
          )}
          {startTime && (
            <span className="text-xs text-gray-600 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(startTime)}
              {durationMinutes ? ` (${durationMinutes} Min)` : ""}
            </span>
          )}
          <span className="text-xs text-gray-600 flex items-center gap-1">
            <Users className="w-3 h-3" />
            {bookedSeats}/{maxSeats}
          </span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <StatCard
          icon={<Users className="w-4 h-4" />}
          label="Teilnehmer:innen"
          value={`${totalCount}/${maxSeats}`}
        />
        <StatCard
          icon={<Repeat className="w-4 h-4" />}
          label="Wiederkehrend"
          value={`${stats.returningCount}`}
          sub={`${stats.newCount} neu`}
        />
        {stats.byCourseType.size > 0 && (
          <StatCard
            icon={<Sparkles className="w-4 h-4" />}
            label="Kurstyp-Mix"
            value={[...stats.byCourseType.entries()]
              .map(([k, v]) => `${v} ${COURSE_TYPE_LABEL[k] || k}`)
              .join(" · ")}
            fullWidth
          />
        )}
        {stats.bySpecialty.size > 0 && (
          <StatCard
            icon={<Stethoscope className="w-4 h-4" />}
            label="Fachrichtungen"
            value={topEntries(stats.bySpecialty, 3)
              .map(([k, v]) => `${k} (${v})`)
              .join(", ")}
            fullWidth
          />
        )}
      </div>

      {/* Alerts */}
      {(incomplete.length > 0 || withNotes.length > 0) && (
        <div className="space-y-2 mb-4">
          {incomplete.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-[10px] p-3">
              <div className="flex items-start gap-2 text-amber-800">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">
                    {incomplete.length} Teilnehmer:in{incomplete.length !== 1 ? "nen" : ""} mit
                    unvollständigem Profil
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    EFN, Geburtsdatum oder Adresse fehlen. Für CME-Zertifikate nötig.
                  </p>
                  <ul className="mt-2 space-y-1">
                    {incomplete.map((p) => (
                      <li key={p.bookingId}>
                        <LinkableName participant={p} className="text-sm text-amber-900 underline" />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          {withNotes.length > 0 && (
            <div className="bg-white rounded-[10px] p-3">
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-black">
                    Notizen ({withNotes.length})
                  </p>
                  <ul className="mt-1 space-y-2">
                    {withNotes.map((p) => (
                      <li key={p.bookingId} className="text-xs">
                        <LinkableName
                          participant={p}
                          className="font-semibold text-black"
                        />
                        <p className="text-gray-600 whitespace-pre-wrap">{p.notes}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Participants */}
      <h2 className="text-sm font-bold text-black mb-2">
        Teilnehmer:innen ({totalCount})
      </h2>
      {totalCount === 0 && (
        <p className="text-center text-sm text-gray-400 py-8 bg-white rounded-[10px]">
          Noch keine Buchungen.
        </p>
      )}
      <div className="space-y-3">
        {grouped.map(([courseType, rows]) => (
          <div key={courseType} className="bg-white rounded-[10px] overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {COURSE_TYPE_LABEL[courseType] || courseType}
              </span>
              <span className="text-xs text-gray-400">{rows.length}</span>
            </div>
            <ul>
              {rows.map((p) => (
                <ParticipantRow key={p.bookingId} p={p} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  fullWidth,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-[10px] p-3 ${fullWidth ? "col-span-2" : ""}`}
    >
      <div className="flex items-center gap-1 text-xs text-gray-500">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-base font-bold text-black leading-tight break-words">
        {value}
      </div>
      {sub && <div className="text-[11px] text-gray-500 mt-0.5">{sub}</div>}
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
        href={`/m/kontakte/arzt/${participant.auszubildendeId}`}
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

  const row = (
    <div className="px-4 py-3 active:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-black truncate">{name}</span>
            {p.priorSessionsCount > 0 && (
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 rounded px-1.5 py-0.5 inline-flex items-center gap-0.5">
                <Repeat className="w-2.5 h-2.5" />
                {p.priorSessionsCount}×
              </span>
            )}
            {p.auszubildendeId && p.profileComplete === false && (
              <span
                className="text-[10px] font-medium text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 inline-flex items-center gap-0.5"
                title="Profil unvollständig"
              >
                <AlertTriangle className="w-2.5 h-2.5" />
                Profil
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
            {p.specialty && (
              <span className="flex items-center gap-1">
                <Stethoscope className="w-3 h-3" />
                {p.specialty}
              </span>
            )}
            {p.companyName && (
              <span className="flex items-center gap-1 truncate">
                <Building2 className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{p.companyName}</span>
              </span>
            )}
            {!p.companyName && p.addressCity && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {p.addressCity}
              </span>
            )}
          </div>
        </div>
        {p.auszubildendeId && (
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
        )}
      </div>
    </div>
  );

  if (p.auszubildendeId) {
    return (
      <li>
        <Link href={`/m/kontakte/arzt/${p.auszubildendeId}`} className="block">
          {row}
        </Link>
      </li>
    );
  }
  return <li>{row}</li>;
}
