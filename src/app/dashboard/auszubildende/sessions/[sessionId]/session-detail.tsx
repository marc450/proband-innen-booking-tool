"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  User,
  Clock,
  Users,
  AlertTriangle,
  Building2,
  Repeat,
  FileText,
  CheckCircle2,
  Mail,
  Loader2,
  LinkIcon,
  Check,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPersonName } from "@/lib/utils";
import { buildProfileCompletionUrl } from "@/lib/profile-link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ManualCourseBookingModal } from "@/components/manual-course-booking-modal";
import { UserPlus } from "lucide-react";

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
  instructorName: string | null;
  betreuerName: string | null;
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

export function SessionDetail({
  sessionId,
  templateTitle,
  courseLabelDe,
  dateIso,
  instructorName,
  betreuerName,
  address,
  startTime,
  durationMinutes,
  maxSeats,
  bookedSeats,
  participants,
}: Props) {
  const totalCount = participants.length;

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
            <h1 className="text-2xl font-bold leading-snug">
              {courseLabelDe || templateTitle}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{formatLongDate(dateIso)}</p>
            {startTime && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatTime(startTime)}
                {durationMinutes ? ` (${durationMinutes} Min)` : ""}
              </p>
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
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h2 className="text-lg font-bold">
            Teilnehmer:innen ({totalCount})
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <ManualBookingButton sessionId={sessionId} />
            <CreateCampaignButton
              sessionTitle={courseLabelDe || templateTitle}
              dateIso={dateIso}
              participants={participants}
            />
          </div>
        </div>
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
  // Per-row copy state for the profile-completion link. Each row owns
  // its own flag so multiple "Unvollständig" rows can show the
  // success tick without flapping each other.
  const [copiedLink, setCopiedLink] = useState(false);

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
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
              <AlertTriangle className="w-3 h-3" />
              Unvollständig
            </span>
            {p.email && (
              <button
                type="button"
                title="Profil-Vervollständigungs-Link kopieren"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!p.email) return;
                  const url = buildProfileCompletionUrl(p.bookingId, p.email);
                  navigator.clipboard.writeText(url);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="inline-flex items-center text-amber-700 hover:text-amber-900 transition-colors cursor-pointer"
              >
                {copiedLink ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <LinkIcon className="w-3.5 h-3.5" />
                )}
              </button>
            )}
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

// Creates a draft campaign in email_campaigns with the session's
// participants pre-attached as included_patient_ids, then redirects to
// the campaign edit page so the user can fill in subject + body. Only
// participants with a linked auszubildende_id are addressable through
// campaigns; orphan course bookings (no profile) are silently skipped.
function CreateCampaignButton({
  sessionTitle,
  dateIso,
  participants,
}: {
  sessionTitle: string;
  dateIso: string;
  participants: Participant[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const addressableIds = participants
    .map((p) => p.auszubildendeId)
    .filter((id): id is string => Boolean(id))
    .map((id) => `a-${id}`);

  const handleCreate = async () => {
    if (creating || addressableIds.length === 0) return;
    setCreating(true);
    try {
      const supabase = createClient();
      const dateStr = new Date(dateIso).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      const { data, error } = await supabase
        .from("email_campaigns")
        .insert({
          name: `${sessionTitle} | ${dateStr}`,
          subject: "",
          body_text: "",
          content_blocks: [{ type: "text", text: "" }],
          audience_type: "aerztinnen",
          included_patient_ids: addressableIds,
          excluded_patient_ids: [],
          status: "draft",
          recipient_count: 0,
        })
        .select("id")
        .single();
      if (error || !data) {
        setCreating(false);
        return;
      }
      router.push(`/dashboard/campaigns/${data.id}`);
    } catch {
      setCreating(false);
    }
  };

  const disabled = creating || addressableIds.length === 0;

  return (
    <Button
      onClick={handleCreate}
      disabled={disabled}
      title={
        addressableIds.length === 0
          ? "Keine Teilnehmer:innen mit verknüpftem Profil — Kampagne nicht möglich."
          : `Kampagne mit ${addressableIds.length} Teilnehmer:in${addressableIds.length === 1 ? "" : "nen"} erstellen`
      }
    >
      {creating ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Erstelle...
        </>
      ) : (
        <>
          <Mail className="w-4 h-4 mr-2" />
          Kampagne an Teilnehmer:innen
        </>
      )}
    </Button>
  );
}

// Legacy-cleanup helper. Opens a modal that lets the user search for an
// Auszubildende:r and attach them directly to this session. Bypasses
// the create_course_booking RPC entirely — no Stripe, no email, no
// Slack, no capacity check.
function ManualBookingButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <UserPlus className="w-4 h-4 mr-2" />
        Manuell hinzufügen
      </Button>
      <ManualCourseBookingModal
        open={open}
        onOpenChange={setOpen}
        sessionId={sessionId}
        onCreated={() => router.refresh()}
      />
    </>
  );
}
