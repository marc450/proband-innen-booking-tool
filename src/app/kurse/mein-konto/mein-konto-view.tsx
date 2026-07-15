"use client";

import { useState } from "react";
import Image from "next/image";
import { Clock, User, MapPin, Info, Users } from "lucide-react";
import { parseDateOnly } from "@/lib/date";
import { TITLE_OPTIONS } from "@/lib/utils";
import { ONLINE_COURSE_MIN_PCT } from "@/lib/online-course";

// Customer-facing dashboard view.
//
// Three sections, in priority order:
//   1. Anstehende Termine — Praxis/Kombi/Hybrid bookings whose date is
//      in the future. Each renders as a hero card with a date block,
//      title + image, and the Proband-Buddy CTA (no reschedule per
//      product decision).
//   2. Deine Onlinekurse — image cards in a 1/2/3-col grid. Single
//      "Zum Kurs →" CTA out to LW. Progress bar pulls from the LW
//      v2 API (one call per page load) when the customer has an
//      lw_user_id set on auszubildende.
//   3. Abgeschlossen — compact list rows. "Past attendance is assumed"
//      rule applies: anything past + not cancelled is rendered as
//      participated.
//
// Sign-out lives in the header CTA on /mein-konto, not on this page.

export type CourseType =
  | "Onlinekurs"
  | "Praxiskurs"
  | "Kombikurs"
  | "Hybrid"
  | "Merch"
  | "Kurs";

export interface EnrichedBooking {
  id: string;
  productName: string;
  displayTitle: string;
  courseType: CourseType;
  courseDate: string | null;
  purchasedAt: string | null;
  source: string | null;
  imageUrl: string | null;
  lwHref: string | null;
  // LW course slug, kept separately so we can look up progress against
  // it without parsing it back out of lwHref (which now routes through
  // our SSO bridge and no longer contains the bare /course/<slug> path).
  lwSlug: string | null;
  // Populated for Praxiskurs cards sourced from course_bookings +
  // course_sessions. Legacy bookings pre-date the structured-session
  // schema and leave these null.
  location: string | null;
  startTime: string | null;
  instructor: string | null;
  // Online-only: % completion from the LW v2 API. Null when the
  // customer has no lw_user_id, when the course doesn't appear in
  // their LW enrollments, or when the LW API call failed (we fall
  // back to a card without a progress bar instead of failing the
  // whole page).
  progressPct?: number | null;
}

export interface AccountProfile {
  firstName: string;
  lastName: string;
  title: string;
  // Read-only: the auth login + booking-dedup key. Shown but not editable
  // here; changing it needs a separate verified flow.
  email: string;
  companyName: string;
  vatId: string;
  addressLine1: string;
  addressPostalCode: string;
  addressCity: string;
  addressCountry: string;
}

interface Props {
  firstName: string | null;
  profile: AccountProfile | null;
  upcoming: EnrichedBooking[];
  online: EnrichedBooking[];
  done: EnrichedBooking[];
}

const CORAL = "#BF785E";
// Private (doctor-referred) Proband:innen funnel: no payment capture,
// since the proband comes in as the Auszubildende's own guest. NOT the
// public root funnel (proband-innen.ephia.de/), which captures a card
// for the no-show fee.
const PROBAND_FUNNEL_URL = "https://proband-innen.ephia.de/book/privat";

const MONTHS_DE = [
  "Jan",
  "Feb",
  "März",
  "Apr",
  "Mai",
  "Juni",
  "Juli",
  "Aug",
  "Sept",
  "Okt",
  "Nov",
  "Dez",
];

const WEEKDAYS_DE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function formatLongDate(iso: string | null): string | null {
  if (!iso) return null;
  return parseDateOnly(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function MeinKontoView({ firstName, profile, upcoming, online, done }: Props) {
  const [probandOpen, setProbandOpen] = useState(false);
  const empty = upcoming.length === 0 && online.length === 0 && done.length === 0;

  return (
    // Match the kurse header's container: max-w-7xl with px-5 md:px-8
    // INSIDE the max-width box, so the content edge lines up with the
    // nav links instead of extending 40-64px past them.
    <div className="min-h-[60vh] pt-12 pb-24">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <h1 className="text-2xl md:text-3xl font-bold text-black mb-2">
          Hi {firstName ?? "Du"}
        </h1>

        {profile && <ProfileCard initial={profile} />}

        {empty && (
          <div className="bg-white rounded-[10px] shadow-sm p-8 mt-10 text-center">
            <p className="text-sm text-black/70">
              Wir haben aktuell keine Kursbuchungen unter dieser E-Mail. Schau Dich gerne in unseren Kursen um.
            </p>
            <a
              href="/unsere-kurse"
              className="inline-block mt-5 bg-[#0066FF] hover:bg-[#0055DD] text-white font-bold text-sm rounded-[10px] px-5 py-3 transition-colors"
            >
              Kurse ansehen →
            </a>
          </div>
        )}

        {upcoming.length > 0 && (
          <Section title="Anstehende Termine" count={upcoming.length}>
            <div className="space-y-5">
              {upcoming.map((b) => (
                <UpcomingCard
                  key={b.id}
                  booking={b}
                  onProbandClick={() => setProbandOpen(true)}
                />
              ))}
            </div>
          </Section>
        )}

        {online.length > 0 && (
          <Section title="Deine Onlinekurse" count={online.length}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {online.map((b) => (
                <OnlineCard key={b.id} booking={b} />
              ))}
            </div>
          </Section>
        )}

        {done.length > 0 && (
          <Section title="Abgeschlossen" count={done.length}>
            <ul className="bg-white rounded-[10px] shadow-sm divide-y divide-black/[0.06]">
              {done.map((b) => (
                <DoneRow key={b.id} booking={b} />
              ))}
            </ul>
          </Section>
        )}

      </div>

      <ProbandBuddyDialog open={probandOpen} onClose={() => setProbandOpen(false)} />
    </div>
  );
}

/* ─────────────────────── Section header ─────────────────────── */

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold text-black mb-5 flex items-baseline gap-2">
        {title}
        <span className="text-xs font-medium text-black/40">{count}</span>
      </h2>
      {children}
    </section>
  );
}

/* ──────────────── Profile card (Deine Daten) ──────────────── */

function fullName(p: AccountProfile): string {
  return [p.title, p.firstName, p.lastName].filter(Boolean).join(" ");
}

function fullAddress(p: AccountProfile): string {
  const cityLine = [p.addressPostalCode, p.addressCity].filter(Boolean).join(" ");
  return [p.addressLine1, cityLine, p.addressCountry].filter(Boolean).join(", ");
}

function ProfileCard({ initial }: { initial: AccountProfile }) {
  const [saved, setSaved] = useState<AccountProfile>(initial);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<AccountProfile>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const startEdit = () => {
    setForm(saved);
    setError(null);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setError(null);
  };

  const set = (key: keyof AccountProfile, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("Vor- und Nachname sind erforderlich.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/account/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          title: form.title,
          companyName: form.companyName,
          vatId: form.vatId,
          addressLine1: form.addressLine1,
          addressPostalCode: form.addressPostalCode,
          addressCity: form.addressCity,
          addressCountry: form.addressCountry,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Speichern fehlgeschlagen.");
        return;
      }
      // Reflect the server-normalised title ("Kein Titel" → null) so the
      // read view doesn't render the sentinel. Email stays as-is (read-only,
      // not echoed back).
      const next: AccountProfile = {
        ...form,
        title: (data?.profile?.title as string | null) ?? "",
        email: saved.email,
      };
      setSaved(next);
      setEditing(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    } catch {
      setError("Speichern fehlgeschlagen. Bitte versuch es erneut.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-8">
      <div className="bg-white rounded-[10px] shadow-sm p-6 md:p-8">
        <div className="flex items-start justify-between gap-4 mb-5">
          <h2 className="text-lg font-bold text-black">Deine Daten</h2>
          {!editing && (
            <button
              type="button"
              onClick={startEdit}
              className="text-sm font-bold text-[#0066FF] hover:underline shrink-0"
            >
              Bearbeiten
            </button>
          )}
        </div>

        {!editing ? (
          <>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <ReadField label="Name" value={fullName(saved)} />
              <ReadField label="E-Mail" value={saved.email} />
              <ReadField label="Praxisname" value={saved.companyName} />
              <ReadField label="USt-IdNr." value={saved.vatId} />
              <div className="sm:col-span-2">
                <ReadField label="Adresse" value={fullAddress(saved)} />
              </div>
            </dl>
            {justSaved && (
              <p className="text-sm font-medium text-[#0066FF] mt-5">
                Gespeichert.
              </p>
            )}
          </>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SelectField
                label="Titel"
                value={form.title}
                onChange={(v) => set("title", v)}
                options={TITLE_OPTIONS}
              />
              <EditField
                label="Vorname"
                value={form.firstName}
                onChange={(v) => set("firstName", v)}
                required
              />
              <EditField
                label="Nachname"
                value={form.lastName}
                onChange={(v) => set("lastName", v)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-black/60 mb-1.5">
                E-Mail
              </label>
              <input
                readOnly
                value={saved.email}
                className="w-full bg-black/[0.04] text-black/50 rounded-[10px] px-4 py-3 text-sm focus:outline-none cursor-not-allowed"
              />
              <p className="text-xs text-black/40 mt-1.5">
                Deine E-Mail ist Dein Login. Melde Dich bei uns, wenn Du sie ändern möchtest.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <EditField
                label="Praxisname"
                value={form.companyName}
                onChange={(v) => set("companyName", v)}
              />
              <EditField
                label="USt-IdNr."
                value={form.vatId}
                onChange={(v) => set("vatId", v)}
                placeholder="z. B. DE123456789"
              />
            </div>

            <EditField
              label="Straße und Hausnummer"
              value={form.addressLine1}
              onChange={(v) => set("addressLine1", v)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <EditField
                label="PLZ"
                value={form.addressPostalCode}
                onChange={(v) => set("addressPostalCode", v)}
              />
              <div className="sm:col-span-2">
                <EditField
                  label="Ort"
                  value={form.addressCity}
                  onChange={(v) => set("addressCity", v)}
                />
              </div>
            </div>
            <EditField
              label="Land"
              value={form.addressCountry}
              onChange={(v) => set("addressCountry", v)}
              placeholder="z. B. Deutschland"
            />

            {error && <p className="text-sm font-medium text-red-600">{error}</p>}

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="text-sm font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-6 py-3 transition-colors disabled:opacity-60"
              >
                {saving ? "Speichern …" : "Speichern"}
              </button>
              <button
                type="button"
                onClick={cancel}
                disabled={saving}
                className="text-sm font-medium text-black/60 hover:text-black rounded-[10px] px-6 py-3 transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-black/60 mb-1">{label}</dt>
      <dd className="text-sm text-black/85 break-words">
        {value?.trim() ? value : <span className="text-black/35">Nicht angegeben</span>}
      </dd>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  // The stored title may be empty (no title) or a legacy value not in the
  // canonical list. Fall back to the "Kein Titel" sentinel so the select
  // always shows a valid, selected option.
  const selected = options.includes(value) ? value : "Kein Titel";
  return (
    <div>
      <label className="block text-xs font-semibold text-black/60 mb-1.5">
        {label}
      </label>
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#FAEBE1] rounded-[10px] px-4 py-3 text-sm text-black/85 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/30 appearance-none cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-black/60 mb-1.5">
        {label}
        {required && <span className="text-[#0066FF]"> *</span>}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#FAEBE1] rounded-[10px] px-4 py-3 text-sm text-black/85 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/30"
      />
    </div>
  );
}

/* ──────────────── Upcoming Praxis/Kombi hero card ──────────────── */

function UpcomingCard({
  booking,
  onProbandClick,
}: {
  booking: EnrichedBooking;
  onProbandClick: () => void;
}) {
  const date = booking.courseDate ? parseDateOnly(booking.courseDate) : null;
  const dayNum = date?.getDate();
  const monthLabel = date ? MONTHS_DE[date.getMonth()] : null;
  const weekdayLabel = date ? WEEKDAYS_DE[date.getDay()] : null;

  return (
    <article className="bg-white rounded-[10px] shadow-sm overflow-hidden flex flex-col md:flex-row">
      {/* Left: date tear-off */}
      {date && (
        <div
          className="flex md:flex-col items-center justify-center px-6 md:px-8 py-5 md:py-6 md:min-w-[160px] gap-3 md:gap-1 text-white"
          style={{ backgroundColor: CORAL }}
        >
          <span className="text-xs font-bold tracking-[0.2em] uppercase opacity-90">
            {weekdayLabel}
          </span>
          <span className="text-4xl md:text-5xl font-bold leading-none tabular-nums">
            {dayNum}
          </span>
          <span className="text-xs font-bold tracking-[0.15em] uppercase opacity-90">
            {monthLabel}
          </span>
        </div>
      )}

      {/* Right: details. Title + session details + soft prereq +
          single Proband-Buddy CTA. We removed the Praxiskurs / "in N
          Tagen" pills (date already on the tear-off, type implied by
          this whole section being titled "Anstehende Termine") and
          the "Zum Kurs" CTA (the Praxiskurs is an in-person event,
          not an LW page worth opening). */}
      <div className="flex flex-col flex-1 p-6 md:p-8 gap-3">
        <h3 className="text-xl md:text-2xl font-bold tracking-wide leading-tight text-black text-balance">
          {booking.displayTitle}
        </h3>

        {/* Practical details — icon column drops the "Start:/Dozent:in:/Ort:"
            labels, the icon IS the label. Same vertical rhythm so the
            three rows scan as a single block. */}
        {(booking.startTime || booking.location || booking.instructor) && (
          <ul className="text-sm text-black/75 space-y-2">
            {booking.startTime && (
              <li className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-black/40 flex-shrink-0" aria-hidden="true" />
                <span>
                  <span className="sr-only">Start: </span>
                  {booking.startTime.slice(0, 5)} Uhr
                </span>
              </li>
            )}
            {booking.instructor && (
              <li className="flex items-center gap-2.5">
                <User className="w-4 h-4 text-black/40 flex-shrink-0" aria-hidden="true" />
                <span>
                  <span className="sr-only">Dozent:in: </span>
                  {booking.instructor}
                </span>
              </li>
            )}
            {booking.location && (
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 mt-0.5 text-black/40 flex-shrink-0" aria-hidden="true" />
                <span>
                  <span className="sr-only">Ort: </span>
                  {booking.location}
                </span>
              </li>
            )}
          </ul>
        )}

        {/* Notes block — softer treatment so it visually separates
            from the practical details above without a border (we stay
            border-free per brand). Each note has its own coloured icon
            so it's obvious at a glance which is "FYI" vs which is the
            Proband-Buddy nudge. */}
        <div className="rounded-[10px] bg-black/[0.03] p-3.5 mt-1 space-y-2.5 text-sm text-black/75">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 mt-0.5 text-[#0066FF] flex-shrink-0" aria-hidden="true" />
            <p>
              Schließe vor Deinem Praxistermin mindestens {ONLINE_COURSE_MIN_PCT} % des dazugehörigen Onlinekurses ab. Das ist Voraussetzung für Deine Teilnahme.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <Users className="w-4 h-4 mt-0.5 text-[#BF785E] flex-shrink-0" aria-hidden="true" />
            <p>
              Bring eine:n Freund:in mit als Proband:in. Optional, aber sehr beliebt.
            </p>
          </div>
        </div>

        <div className="mt-2">
          <button
            type="button"
            onClick={onProbandClick}
            className="inline-flex items-center justify-center text-sm md:text-base font-bold text-[#0066FF] border border-[#0066FF] hover:bg-[#0066FF]/10 rounded-[10px] px-5 py-3 transition-colors"
          >
            Proband:in einladen
          </button>
        </div>
      </div>
    </article>
  );
}

/* ──────────────── Online course tile ──────────────── */

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const label =
    clamped === 0
      ? "Noch nicht gestartet"
      : clamped >= 100
        ? "Abgeschlossen"
        : `${Math.round(clamped)}% abgeschlossen`;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-black/60 font-medium">{label}</span>
        <span className="text-black/40 tabular-nums">{Math.round(clamped)}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#0066FF] transition-[width] duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

function OnlineCard({ booking }: { booking: EnrichedBooking }) {
  return (
    <article className="bg-white rounded-[10px] overflow-hidden flex flex-col group shadow-sm">
      {booking.imageUrl ? (
        <div className="relative aspect-[4/3] bg-black/5 overflow-hidden">
          <Image
            src={booking.imageUrl}
            alt={booking.displayTitle}
            fill
            quality={85}
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
      ) : (
        <div
          className="aspect-[4/3] flex items-center justify-center"
          style={{ backgroundColor: CORAL }}
          aria-hidden="true"
        >
          <span className="text-white/90 text-xs font-semibold tracking-[0.2em]">
            ONLINEKURS
          </span>
        </div>
      )}

      <div className="flex flex-col flex-1 p-6 gap-3">
        <h3 className="text-lg md:text-xl font-bold tracking-wide leading-tight text-black text-balance">
          {booking.displayTitle}
        </h3>

        {/* Spacer pushes the progress + CTA to the bottom of the card. */}
        <div className="flex-1" />

        {/* Progress bar lights up when LW returned a percent for this
            course. We render it for any value 0..100 (including 0) so
            customers see "you haven't started yet" as an empty bar
            rather than nothing. We hide the bar entirely only when
            progressPct is null/undefined (no data available). */}
        {typeof booking.progressPct === "number" && (
          <ProgressBar pct={booking.progressPct} />
        )}

        {booking.lwHref ? (
          <a
            href={booking.lwHref}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center w-full text-sm md:text-base font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-5 py-3 transition-colors"
          >
            {/* CTA reads progress when we have it, falls back to a
                neutral label otherwise:
                  100   → Zum Kurs (review / certificate)
                  1..99 → Weiterlernen (resume)
                  0     → Kurs starten (first click)
                  null  → Zum Kurs (no progress data; don't guess) */}
            {booking.progressPct === 100
              ? "Zum Kurs →"
              : typeof booking.progressPct === "number" &&
                  booking.progressPct > 0
                ? "Weiterlernen →"
                : booking.progressPct === 0
                  ? "Kurs starten →"
                  : "Zum Kurs →"}
          </a>
        ) : (
          <span className="block text-center w-full text-sm font-medium text-black/50 bg-black/[0.04] rounded-[10px] px-5 py-3">
            Kurs nicht verfügbar
          </span>
        )}
      </div>
    </article>
  );
}

/* ──────────────── Done row (compact) ──────────────── */

function DoneRow({ booking }: { booking: EnrichedBooking }) {
  const dateLabel = booking.courseDate
    ? `Teilgenommen am ${formatLongDate(booking.courseDate)}`
    : booking.purchasedAt
    ? `Gekauft am ${formatLongDate(booking.purchasedAt)}`
    : null;

  return (
    <li className="px-5 md:px-6 py-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-black truncate">
          {booking.displayTitle}
        </p>
        <p className="text-xs text-black/60 mt-0.5">
          {booking.courseType}
          {dateLabel ? ` · ${dateLabel}` : ""}
        </p>
      </div>
      {booking.lwHref && (
        <a
          href={booking.lwHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-[#0066FF] hover:underline shrink-0"
        >
          Zum Kurs →
        </a>
      )}
    </li>
  );
}

/* ──────────────── Proband-Buddy dialog ──────────────── */

function ProbandBuddyDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const shareMessage = `Ich nehme an einem Ausbildungskurs bei EPHIA teil und darf eine:n Proband:in mitbringen, an der/dem ich behandle. Lust mitzukommen? Mehr Infos und Anmeldung als Proband:in: ${PROBAND_FUNNEL_URL}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(PROBAND_FUNNEL_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard API not available — fall back silently.
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Proband:in einladen"
    >
      <div
        className="bg-white rounded-[10px] shadow-xl w-full max-w-md p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-black mb-3">Bring eine:n Freund:in mit als Proband:in.</h3>
        <p className="text-sm text-black/70 leading-relaxed mb-5">
          Im Kurs darf jede:r Auszubildende eine:n Proband:in mitbringen, an der/dem behandelt wird. Optional, aber sehr beliebt. Du hast bereits eine entsprechende E-Mail von uns dazu erhalten.
        </p>

        <p className="text-xs font-semibold text-black/60 mb-2">
          Link zur Proband:innen-Anmeldung
        </p>
        <div className="flex items-center gap-2 mb-5">
          <input
            readOnly
            value={PROBAND_FUNNEL_URL}
            className="flex-1 bg-[#FAEBE1] rounded-[10px] px-4 py-3 text-sm text-black/80 focus:outline-none"
            onFocus={(e) => e.target.select()}
          />
          <button
            type="button"
            onClick={copyLink}
            className="text-sm font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-4 py-3 transition-colors shrink-0"
          >
            {copied ? "Kopiert" : "Kopieren"}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-sm font-bold text-[#0066FF] border border-[#0066FF] hover:bg-[#0066FF]/10 rounded-[10px] px-4 py-3 transition-colors"
          >
            Per WhatsApp teilen
          </a>
          <a
            href={`mailto:?subject=${encodeURIComponent("Lust auf eine Behandlung als Proband:in?")}&body=${encodeURIComponent(shareMessage)}`}
            className="flex-1 text-center text-sm font-bold text-[#0066FF] border border-[#0066FF] hover:bg-[#0066FF]/10 rounded-[10px] px-4 py-3 transition-colors"
          >
            Per E-Mail teilen
          </a>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="block w-full text-center mt-5 text-sm font-medium text-black/50 hover:text-black transition-colors"
        >
          Schließen
        </button>
      </div>
    </div>
  );
}
