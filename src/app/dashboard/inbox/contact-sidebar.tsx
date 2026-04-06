"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Loader2,
  UserPlus,
  BookOpen,
  Receipt,
  AlertTriangle,
} from "lucide-react";
import { EditableField } from "./editable-field";

export interface ContactDTO {
  source: "auszubildende" | "patient" | "unknown";
  id: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  phone: string | null;
  companyName: string | null;
  specialty: string | null;
  efn: string | null;
  gender: string | null;
  birthdate: string | null;
  addressLine1: string | null;
  addressPostalCode: string | null;
  addressCity: string | null;
  addressCountry: string | null;
  notes: string | null;
  status: string | null;
  createdAt: string | null;
  patientStatus: string | null;
}

interface CourseBooking {
  id: string;
  status: string;
  amount_paid: number | null;
  course_type: string | null;
  created_at: string;
  course_templates: { title: string | null } | null;
  course_sessions: { date_iso: string | null; label_de: string | null } | null;
}

interface StripeInvoice {
  id: string;
  number: string | null;
  status: string;
  amount_due: number;
  amount_paid: number;
  currency: string;
  created: number;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
}

interface NoShow {
  id: string;
  created_at: string;
  status: string;
  slot_id: string;
}

interface ContactPayload {
  contact: ContactDTO;
  courseBookings: CourseBooking[];
  invoices: StripeInvoice[];
  noShows: NoShow[];
}

interface Props {
  email: string | null;
  displayName?: string;
}

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatDate(iso: string | null) {
  if (!iso) return "–";
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const TITLE_OPTIONS = ["Dr. med.", "Dr. med. dent.", "Prof. Dr.", "PD Dr.", "Kein Titel"];
const GENDER_OPTIONS = ["Weiblich", "Männlich", "Divers"];
const SPECIALTIES = [
  "Allgemeinmedizin", "Anatomie", "Anästhesiologie", "Arbeitsmedizin",
  "Augenheilkunde", "Chirurgie", "Dermatologie", "Gynäkologie",
  "Hals-Nasen-Ohrenkunde", "Humangenetik", "Hygiene- und Umweltmedizin",
  "Hämatologie", "Innere Medizin", "Kardiologie", "Kinder- und Jugendmedizin",
  "Kinder- und Jugendpsychiatrie und -psychotherapie",
  "Mund-Kiefer-Gesichtschirurgie", "Neurochirurgie", "Neurologie",
  "Nuklearmedizin", "Onkologie", "Orthopädie",
  "Öffentliches Gesundheitswesen", "Pathologie", "Pharmakologie",
  "Phoniatrie und Pädaudiologie", "Physikalische und Rehabilitative Medizin",
  "Physiologie", "Psychiatrie und Psychotherapie",
  "Psychosomatische Medizin und Psychotherapie", "Radiologie",
  "Rechtsmedizin", "Strahlentherapie", "Transfusionsmedizin",
  "Urologie", "Unfallchirurgie", "Zahnmedizin",
];

export function ContactSidebar({ email, displayName }: Props) {
  const [data, setData] = useState<ContactPayload | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) {
      setData(null);
      return;
    }
    setLoading(true);
    fetch(`/api/inbox/contact?email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [email]);

  const saveField = async (field: string, value: string | null) => {
    if (!data || !data.contact.id || data.contact.source === "unknown") return;

    // Map UI field names to the physical column for the patient table.
    const patientFieldMap: Record<string, string> = {
      address_line1: "address_street",
      address_postal_code: "address_zip",
    };
    const column =
      data.contact.source === "patient" && patientFieldMap[field]
        ? patientFieldMap[field]
        : field;

    // Optimistic: update local state instantly so the UI never flickers.
    setData({
      ...data,
      contact: {
        ...data.contact,
        [uiFieldToDtoKey(field)]: value,
      },
    });

    await fetch("/api/inbox/contact", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: data.contact.source,
        id: data.contact.id,
        patch: { [column]: value },
      }),
    });
  };

  if (!email) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
        Wähle eine Konversation, um Kontaktdetails zu sehen.
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  const { contact, courseBookings, invoices, noShows } = data;
  const isUnknown = contact.source === "unknown";
  const fullName =
    [contact.firstName, contact.lastName].filter(Boolean).join(" ") ||
    displayName ||
    contact.email;
  const initials =
    ((contact.firstName?.[0] || "") + (contact.lastName?.[0] || "")).toUpperCase() ||
    contact.email[0]?.toUpperCase() ||
    "?";

  const profileHref =
    contact.source === "auszubildende" && contact.id
      ? `/dashboard/auszubildende/personen/${contact.id}`
      : contact.source === "patient" && contact.id
        ? `/dashboard/patients/${contact.id}`
        : null;

  return (
    <div className="h-full overflow-y-auto">
      {/* Header card */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#0066FF]/10 text-[#0066FF] flex items-center justify-center text-sm font-semibold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            {profileHref ? (
              <Link
                href={profileHref}
                className="text-sm font-semibold text-[#0066FF] hover:underline flex items-center gap-1 truncate"
              >
                {fullName}
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
              </Link>
            ) : (
              <p className="text-sm font-semibold truncate">{fullName}</p>
            )}
            <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
          </div>
        </div>
        {isUnknown && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2">
              Dieser Kontakt ist noch nicht im System hinterlegt.
            </p>
            <Link
              href={`/dashboard/auszubildende/personen?type=auszubildende&newEmail=${encodeURIComponent(
                contact.email
              )}`}
              className="inline-flex items-center gap-1.5 text-xs text-[#0066FF] hover:underline"
            >
              <UserPlus className="h-3 w-3" />
              Als Ärzt:in anlegen
            </Link>
          </div>
        )}
      </div>

      {/* About this Contact */}
      {!isUnknown && (
        <section className="p-5 border-b border-gray-100">
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-700 mb-2">
            Kontaktinfos
          </h3>
          <div className="divide-y divide-gray-100">
            <EditableField
              label="Vorname"
              value={contact.firstName}
              onSave={(v) => saveField("first_name", v)}
            />
            <EditableField
              label="Nachname"
              value={contact.lastName}
              onSave={(v) => saveField("last_name", v)}
            />
            <EditableField label="E-Mail" value={contact.email} onSave={() => {}} readOnly />
            <EditableField
              label="Telefon"
              value={contact.phone}
              type="tel"
              onSave={(v) => saveField("phone", v)}
            />
            {contact.source === "auszubildende" && (
              <>
                <EditableField
                  label="Titel"
                  value={contact.title}
                  onSave={(v) => saveField("title", v)}
                  options={TITLE_OPTIONS}
                />
                <EditableField
                  label="Firma"
                  value={contact.companyName}
                  onSave={(v) => saveField("company_name", v)}
                />
                <EditableField
                  label="Fachrichtung"
                  value={contact.specialty}
                  onSave={(v) => saveField("specialty", v)}
                  options={SPECIALTIES}
                />
                <EditableField
                  label="EFN"
                  value={contact.efn}
                  onSave={(v) => saveField("efn", v)}
                />
                <EditableField
                  label="Geschlecht"
                  value={contact.gender}
                  onSave={(v) => saveField("gender", v)}
                  options={GENDER_OPTIONS}
                />
                <EditableField
                  label="Geburtsdatum"
                  type="date"
                  value={contact.birthdate}
                  onSave={(v) => saveField("birthdate", v)}
                />
              </>
            )}
            {contact.source === "patient" && contact.patientStatus && (
              <EditableField
                label="Patient:innen-Status"
                value={contact.patientStatus}
                onSave={() => {}}
                readOnly
              />
            )}
            <EditableField
              label="Adresse"
              value={contact.addressLine1}
              onSave={(v) => saveField("address_line1", v)}
            />
            <EditableField
              label="PLZ"
              value={contact.addressPostalCode}
              onSave={(v) => saveField("address_postal_code", v)}
            />
            <EditableField
              label="Ort"
              value={contact.addressCity}
              onSave={(v) => saveField("address_city", v)}
            />
            {contact.source === "auszubildende" && (
              <EditableField
                label="Land"
                value={contact.addressCountry}
                onSave={(v) => saveField("address_country", v)}
              />
            )}
            <EditableField
              label="Notizen"
              value={contact.notes}
              onSave={(v) => saveField("notes", v)}
              multiline
            />
          </div>
        </section>
      )}

      {/* Kursbuchungen */}
      <section className="p-5 border-b border-gray-100">
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-700 mb-3 flex items-center gap-1.5">
          <BookOpen className="h-3 w-3" />
          Kursbuchungen ({courseBookings.length})
        </h3>
        {courseBookings.length === 0 ? (
          <p className="text-xs text-muted-foreground">Keine Buchungen</p>
        ) : (
          <ul className="space-y-2">
            {courseBookings.slice(0, 10).map((b) => (
              <li key={b.id} className="text-xs">
                <Link
                  href={`/dashboard/auszubildende/buchungen/${b.id}`}
                  className="block hover:bg-gray-50 rounded p-2 -mx-2"
                >
                  <p className="font-medium text-gray-900 truncate">
                    {b.course_templates?.title || "Kurs"}
                  </p>
                  <p className="text-muted-foreground truncate">
                    {b.course_type || "–"}
                    {b.course_sessions?.label_de && ` · ${b.course_sessions.label_de}`}
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    {b.status} · {formatDate(b.created_at)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Rechnungen (Stripe) */}
      <section className="p-5 border-b border-gray-100">
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-700 mb-3 flex items-center gap-1.5">
          <Receipt className="h-3 w-3" />
          Rechnungen ({invoices.length})
        </h3>
        {invoices.length === 0 ? (
          <p className="text-xs text-muted-foreground">Keine Rechnungen</p>
        ) : (
          <ul className="space-y-2">
            {invoices.slice(0, 10).map((inv) => (
              <li key={inv.id} className="text-xs">
                <a
                  href={inv.hosted_invoice_url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:bg-gray-50 rounded p-2 -mx-2"
                >
                  <p className="font-medium text-gray-900 truncate">
                    {inv.number || inv.id}
                  </p>
                  <p className="text-muted-foreground truncate">
                    {formatCurrency(inv.amount_paid || inv.amount_due, inv.currency)} ·{" "}
                    {inv.status}
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    {formatDate(new Date(inv.created * 1000).toISOString())}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* No-Shows */}
      <section className="p-5">
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-700 mb-3 flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3" />
          No-Shows ({noShows.length})
        </h3>
        {noShows.length === 0 ? (
          <p className="text-xs text-muted-foreground">Keine No-Shows</p>
        ) : (
          <ul className="space-y-2">
            {noShows.map((ns) => (
              <li key={ns.id} className="text-xs text-gray-700">
                {formatDate(ns.created_at)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// Maps column names used in the update API back to the camelCase keys on
// the client-side DTO so the optimistic update writes into the right slot.
function uiFieldToDtoKey(field: string): keyof ContactDTO {
  switch (field) {
    case "first_name":
      return "firstName";
    case "last_name":
      return "lastName";
    case "company_name":
      return "companyName";
    case "address_line1":
      return "addressLine1";
    case "address_postal_code":
      return "addressPostalCode";
    case "address_city":
      return "addressCity";
    case "address_country":
      return "addressCountry";
    default:
      return field as keyof ContactDTO;
  }
}
