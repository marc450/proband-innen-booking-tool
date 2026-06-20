// Central config for the Galderma partner-consent flow.
//
// Single source of truth for: who receives the data, the exact consent
// wording shown + signed on the tablet, and the eligibility rule. Bump
// CONSENT_TEXT_VERSION whenever CONSENT_TEXT changes so older signatures
// stay traceable to the wording the participant actually agreed to.
//
// Basis: signed MoU dated 2026-06-20. Recipient is Galderma Laboratorium
// GmbH in Düsseldorf (no third-country transfer). Data scope: first name,
// last name, email, postal address, phone + the attended course.

import type { CourseType } from "@/lib/types";

export const GALDERMA_PARTNER = "galderma" as const;

// Galderma inbox (To + CC). Same recipients for the export and the
// withdrawal forwarder so both contacts share one audit trail.
export const GALDERMA_RECIPIENT_TO = "miyanika.middleton@galderma.com";
export const GALDERMA_RECIPIENT_CC = ["christa.metternich@galderma.com"];

// From/Reply-To for all three mails (participant confirmation, export to
// Galderma, withdrawal forwarder).
export const GALDERMA_FROM = "EPHIA Datenschutz <customerlove@ephia.de>";
export const GALDERMA_REPLY_TO = "customerlove@ephia.de";

// Recipient entity, spelled out for emails, the signed PDF and Datenschutz.
export const GALDERMA_ENTITY = {
  name: "Galderma Laboratorium GmbH",
  address: "Toulouser Allee 23a, 40211 Düsseldorf",
  country: "Deutschland",
} as const;

// Bump on any wording change. Stored on every consent row.
export const CONSENT_TEXT_VERSION = "galderma-2026-06-20";

// The exact wording shown on the tablet and rendered into the signed PDF.
// Mirrors the Anlage of the signed MoU (Düsseldorf, incl. address + phone).
export const CONSENT_TEXT =
  "Ich willige ein, dass die EPHIA Medical GmbH meinen Vor- und Nachnamen, " +
  "meine E-Mail-Adresse, Anschrift und Telefonnummer sowie die Information " +
  "über den von mir absolvierten EPHIA-Kurs an die Galderma Laboratorium " +
  "GmbH (Düsseldorf) übermittelt. Galderma darf diese Daten nutzen, um mir " +
  "Produktinformationen zu Produkten der Galderma Laboratorium GmbH, " +
  "wissenschaftliche Studienzusammenfassungen und Fachartikel sowie " +
  "Einladungen zu Fortbildungen und Fachveranstaltungen zuzusenden. Diese " +
  "Einwilligung ist freiwillig. Ich kann sie jederzeit mit Wirkung für die " +
  "Zukunft widerrufen, ohne dass mir dadurch Nachteile entstehen. Weitere " +
  "Informationen finde ich in der Datenschutzerklärung von EPHIA und der " +
  "Galderma Laboratorium GmbH.";

// Purposes Galderma may use the data for (closed list per the MoU).
export const GALDERMA_PURPOSES = [
  "Zusendung von Produktinformationen zu Produkten der Galderma Laboratorium GmbH",
  "Übermittlung wissenschaftlicher Studienzusammenfassungen und Fachartikel",
  "Einladungen zu Fortbildungen und Fachveranstaltungen von Galderma",
] as const;

// MASTER GO-LIVE GATE. Real Galderma exports stay off until the legal
// sign-offs (anwaltliche Prüfung, Datenweitergabe-Vereinbarung, MoU
// countersignature) are done. Consent collection can run regardless; the
// cron checks this before sending anything to Galderma.
export const GALDERMA_EXPORT_LIVE =
  process.env.GALDERMA_EXPORT_LIVE === "true";

// Course types whose in-person participants are eligible for the consent.
const ELIGIBLE_COURSE_TYPES: CourseType[] = ["Praxiskurs", "Kombikurs"];

// A booking is eligible only if it has an in-person session and is a
// Praxis-/Kombikurs (Onlinekurs-only bookings never meet Galderma in person).
export function isGaldermaEligible(booking: {
  course_type: CourseType | string | null;
  session_id: string | null;
}): boolean {
  return (
    booking.session_id != null &&
    ELIGIBLE_COURSE_TYPES.includes(booking.course_type as CourseType)
  );
}
