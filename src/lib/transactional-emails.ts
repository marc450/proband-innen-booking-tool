import {
  buildEmailHtml,
  PATIENT_PREPARATION_BLOCK,
} from "@/lib/email-template";
import {
  buildCommunityInviteEmail,
  buildInvoiceEmail,
  buildKombikursEmail,
  buildOnlinekursEmail,
  buildPraxiskursEmail,
  buildProbandinnenInfoEmail,
  buildSessionChangeEmail,
} from "@/lib/course-email-templates";

/**
 * Catalog of every transactional email the booking tool sends, grouped by
 * funnel. This file is the read-only source of truth that powers the
 * "Transaktionale E-Mails" page in the admin dashboard. Each entry is
 * paired with a `renderSample()` that returns a realistic preview built
 * with the same template helpers used by the live send paths, so the
 * catalog stays visually faithful to what recipients actually receive.
 *
 * WHEN YOU ADD A NEW TRANSACTIONAL EMAIL:
 *  1. Implement the send logic in the relevant API route (as today).
 *  2. Add an entry here so it surfaces in the admin catalog. Mirror the
 *     subject line and template args of the live send. Sample values
 *     should be plausible but clearly fictional.
 *
 * Kept deliberately tiny (no DB, no edit UI) to match the agreed scope:
 * read-only catalog, edits stay in code.
 */

export type FunnelKey =
  | "proband-public"
  | "proband-private"
  | "proband-updates"
  | "arzt-kursbuchung"
  | "arzt-kursupdates"
  | "kontakt";

export const FUNNEL_LABELS: Record<FunnelKey, string> = {
  "proband-public": "Proband:innen — öffentliche Buchung",
  "proband-private": "Proband:innen — private Buchung",
  "proband-updates": "Proband:innen — Updates & Reminder",
  "arzt-kursbuchung": "Ärzt:innen — Kursbuchung",
  "arzt-kursupdates": "Ärzt:innen — Updates & Stornierung",
  "kontakt": "Kontakt & Anfragen",
};

export const FUNNEL_ORDER: FunnelKey[] = [
  "proband-public",
  "proband-private",
  "proband-updates",
  "arzt-kursbuchung",
  "arzt-kursupdates",
  "kontakt",
];

export interface TransactionalEmail {
  id: string;
  funnel: FunnelKey;
  name: string;
  recipient: "Proband:in" | "Ärzt:in" | "Staff";
  trigger: string;
  codeRef: string;
  description: string;
  renderSample: () => { subject: string; html: string };
}

// Shared sample values used across every preview so recipients all look
// like they're talking to the same fictional Anna about the same course.
const SAMPLE = {
  firstName: "Anna",
  lastName: "Beispiel",
  // `courseTitle` is the internal admin-facing Kursname; `treatmentTitle`
  // is the public-facing "Behandlungsname" from course_templates.
  // Patient-facing emails prefer `treatmentTitle` so recipients see the
  // treatment, not the course.
  courseTitle: "Grundkurs Botulinum",
  treatmentTitle: "Behandlung mimischer Falten mit Botulinum",
  dateFormatted: "Samstag, 24. Mai 2026",
  timeFormatted: "10:30 Uhr",
  time: "10:30",
  location: "HYSTUDIO, Rosa-Luxemburg-Straße 20, 10178 Berlin",
  instructor: "Dr. Sarah Stannek",
  referringDoctor: "Dr. Sophia Wilk-Vollmann",
  sessionDateIso: "2026-05-24",
  startTime: "10:30",
  endTime: "15:30",
  address: "HYSTUDIO, Rosa-Luxemburg-Straße 20, 10178 Berlin",
} as const;

/** Reproduces the hand-rolled HTML in src/app/api/confirm-booking/route.ts.
 * Kept inline (rather than extracted to a shared builder) so the live send
 * path stays untouched. Keep in sync when the route's HTML changes. */
function buildBookingConfirmationSampleHtml(): string {
  const logoUrl =
    "https://lwfiles.mycourse.app/6638baeec5c56514e03ec360-public/f64a1ea1eb5346a171fe9ea36e8615ca.png";
  const infoRows = [
    { label: "Behandlung", value: SAMPLE.treatmentTitle },
    { label: "Datum", value: SAMPLE.dateFormatted },
    { label: "Uhrzeit", value: SAMPLE.timeFormatted },
    { label: "Ort", value: SAMPLE.location },
  ]
    .map(
      (r) =>
        `<p style="margin:0 0 6px;"><span style="font-weight:bold;">${r.label}:</span> ${r.value}</p>`,
    )
    .join("");

  return `<div style="background-color:#fff; padding:0; font-family:Arial, sans-serif;">
  <div style="background-color:#fff; max-width:600px; margin:0 auto; padding:8px; text-align:left; line-height:1.5;">

    <p style="margin-top:0; margin-bottom:20px;">
      Hi ${SAMPLE.firstName},<br><br>
      Deine Buchung für <strong>${SAMPLE.treatmentTitle}</strong> ist bestätigt!<br>
      Wir freuen uns, Dich bald bei uns begrüßen zu dürfen. Hier sind alle wichtigen Infos zu Deinem Termin:
    </p>

    <div style="border-radius:8px; padding:14px 16px; background-color:#FAEBE1; border:1px solid #F0D0B8; font-size:14px; margin:0 0 20px; text-align:left;">
      ${infoRows}
    </div>

    <div style="background-color:#FAEBE1; border:1px solid #F0D0B8; border-radius:8px; padding:14px 16px; margin:0 0 20px; font-size:14px; line-height:1.5;">
      <strong>Wichtiger Hinweis:</strong> Bei Nichterscheinen oder Absage weniger als 48 Stunden vor dem Termin wird eine Ausfallgebühr von 50,00 EUR erhoben.
    </div>

    ${PATIENT_PREPARATION_BLOCK}

    <p style="margin:0 0 20px;">
      Herzliche Grüße,<br>
      Dein EPHIA-Team
    </p>

    <div style="margin-top:24px; padding-top:16px; border-top:1px solid #f0f0f0; text-align:left;">
      <img src="${logoUrl}" alt="EPHIA" style="width:160px; height:auto; display:block; margin:0 0 8px;">
      <div style="color:#9e9e9e; font-size:12px; line-height:1.5;">
        EPHIA Medical GmbH<br>
        Dorfstraße 30, 15913 Märkische Heide, Deutschland<br>
        Geschäftsführerin: Dr. Sophia Wilk-Vollmann
      </div>
    </div>
  </div>
</div>`;
}

// Shared Praxis info block used by the three post-purchase course emails.
const SAMPLE_PRAXIS_INFO = {
  address: SAMPLE.address,
  dateFormatted: SAMPLE.dateFormatted,
  startTime: SAMPLE.startTime,
  endTime: SAMPLE.endTime,
  instructor: SAMPLE.instructor,
};

export const TRANSACTIONAL_EMAILS: TransactionalEmail[] = [
  // ── Proband:innen — öffentliche Buchung ────────────────────────────
  {
    id: "booking-confirmation",
    funnel: "proband-public",
    name: "Buchungsbestätigung (Stripe)",
    recipient: "Proband:in",
    trigger: "Nach erfolgreicher Stripe-Zahlungsbestätigung auf /book/success",
    codeRef: "src/app/api/confirm-booking/route.ts",
    description:
      "Bestätigt die öffentliche Buchung mit Termindetails, Vorbereitungshinweisen und 48h-Stornogebühr.",
    renderSample: () => ({
      subject: `Buchungsbestätigung: ${SAMPLE.treatmentTitle}`,
      html: buildBookingConfirmationSampleHtml(),
    }),
  },

  // ── Proband:innen — private Buchung ────────────────────────────────
  {
    id: "private-booking-confirmation",
    funnel: "proband-private",
    name: "Buchungsbestätigung (Privat)",
    recipient: "Proband:in",
    trigger: "Nach Anlage einer Privatbuchung durch zuweisende:n Ärzt:in",
    codeRef: "src/app/api/create-private-booking/route.ts",
    description:
      "Bestätigt die ärztlich zugewiesene Privatbuchung inklusive Zuweiser:in und Vorbereitungshinweisen. Keine Zahlung, keine Ausfallgebühr.",
    renderSample: () => ({
      subject: `Buchungsbestätigung: ${SAMPLE.treatmentTitle}`,
      html: buildEmailHtml({
        firstName: SAMPLE.firstName,
        intro: `Du wurdest von <strong>${SAMPLE.referringDoctor}</strong> als Privatpatient:in für die folgende Behandlung angemeldet:`,
        infoRows: [
          { label: "Behandlung", value: SAMPLE.treatmentTitle },
          { label: "Datum", value: SAMPLE.dateFormatted },
          { label: "Uhrzeit", value: SAMPLE.timeFormatted },
          { label: "Ort", value: SAMPLE.location },
          { label: "Zuweisende:r Ärzt:in", value: SAMPLE.referringDoctor },
        ],
        extraContent: `${PATIENT_PREPARATION_BLOCK}

          <p style="margin:0 0 20px;">
            Solltest Du weitere Fragen haben, melde Dich jederzeit bei uns:
            <a href="mailto:customerlove@ephia.de" style="color:#0066FF; text-decoration:none;">customerlove@ephia.de</a>
          </p>
        `,
      }),
    }),
  },

  // ── Proband:innen — Updates & Reminder ─────────────────────────────
  {
    id: "slot-change",
    funnel: "proband-updates",
    name: "Terminänderung",
    recipient: "Proband:in",
    trigger: "Admin verschiebt einen Slot im Dashboard",
    codeRef: "src/app/api/send-slot-change-email/route.ts",
    description:
      "Neue Termindetails mit Vorbereitungshinweisen und (bei öffentlichen Buchungen) erneuter 48h-Stornogebühr.",
    renderSample: () => ({
      subject: `Terminänderung: ${SAMPLE.treatmentTitle}`,
      html: buildEmailHtml({
        firstName: SAMPLE.firstName,
        intro: `Dein Termin für <strong>${SAMPLE.treatmentTitle}</strong> wurde geändert. Hier sind Deine neuen Termindetails:`,
        infoRows: [
          { label: "Behandlung", value: SAMPLE.treatmentTitle },
          { label: "Datum", value: SAMPLE.dateFormatted },
          { label: "Uhrzeit", value: SAMPLE.timeFormatted },
          { label: "Ort", value: SAMPLE.location },
        ],
        note:
          "Bei Nichterscheinen oder Absage weniger als 48 Stunden vor dem Termin wird eine Ausfallgebühr von 50,00 EUR erhoben.",
        extraContent: `${PATIENT_PREPARATION_BLOCK}

          <p style="margin:0 0 20px;">
            Solltest Du Fragen haben oder einen anderen Termin benötigen, melde Dich jederzeit bei uns:
            <a href="mailto:customerlove@ephia.de" style="color:#0066FF; text-decoration:none;">customerlove@ephia.de</a>
          </p>`,
      }),
    }),
  },
  {
    id: "booking-cancellation",
    funnel: "proband-updates",
    name: "Stornierung",
    recipient: "Proband:in",
    trigger: "Admin storniert eine Buchung im Dashboard",
    codeRef: "src/app/api/send-booking-cancellation-email/route.ts",
    description:
      "Informiert über die Stornierung eines bestätigten Termins und lädt zur Neubuchung ein.",
    renderSample: () => ({
      subject: `Stornierung Deines Termins: ${SAMPLE.treatmentTitle}`,
      html: buildEmailHtml({
        firstName: SAMPLE.firstName,
        intro: `Dein Termin für <strong>${SAMPLE.treatmentTitle}</strong> wurde storniert. Hier sind die Details des stornierten Termins:`,
        infoRows: [
          { label: "Behandlung", value: SAMPLE.treatmentTitle },
          { label: "Datum", value: SAMPLE.dateFormatted },
          { label: "Uhrzeit", value: SAMPLE.timeFormatted },
          { label: "Ort", value: SAMPLE.location },
        ],
        extraContent: `<p style="margin:0 0 20px;">
          Falls Du einen neuen Termin buchen möchtest oder Fragen zur Stornierung hast, melde Dich jederzeit bei uns:
          <a href="mailto:customerlove@ephia.de" style="color:#0066FF; text-decoration:none;">customerlove@ephia.de</a>
        </p>`,
      }),
    }),
  },
  {
    id: "reminder-72h",
    funnel: "proband-updates",
    name: "Erinnerung (72 Stunden vorher)",
    recipient: "Proband:in",
    trigger: "Cronjob, 72 Stunden vor Slot-Start, genau einmal pro Buchung",
    codeRef: "src/app/api/send-reminders/route.ts",
    description:
      "Erinnert 3 Tage vorher an den bevorstehenden Termin mit Vorbereitungshinweisen.",
    renderSample: () => ({
      subject: `Erinnerung: Dein Termin bei EPHIA in 3 Tagen`,
      html: buildEmailHtml({
        firstName: SAMPLE.firstName,
        intro:
          "in 3 Tagen ist es soweit: Dein Termin bei EPHIA steht an. Bitte sei 10 Minuten vor Deinem Termin da.",
        infoRows: [
          { label: "Behandlung", value: SAMPLE.treatmentTitle },
          { label: "Datum", value: SAMPLE.dateFormatted },
          { label: "Uhrzeit", value: SAMPLE.timeFormatted },
          { label: "Ort", value: SAMPLE.location },
        ],
      }),
    }),
  },
  {
    id: "reminder-24h",
    funnel: "proband-updates",
    name: "Erinnerung (24 Stunden vorher)",
    recipient: "Proband:in",
    trigger: "Cronjob, 24 Stunden vor Slot-Start, genau einmal pro Buchung",
    codeRef: "src/app/api/send-reminders/route.ts",
    description:
      "Kurze Erinnerung am Vortag, damit Termin und Uhrzeit nochmal sichtbar werden.",
    renderSample: () => ({
      subject: `Erinnerung: Dein Termin bei EPHIA ist morgen`,
      html: buildEmailHtml({
        firstName: SAMPLE.firstName,
        intro:
          "eine kurze Erinnerung: Dein Termin ist morgen. Bitte sei 10 Minuten vor Deinem Termin da.",
        infoRows: [
          { label: "Behandlung", value: SAMPLE.treatmentTitle },
          { label: "Datum", value: SAMPLE.dateFormatted },
          { label: "Uhrzeit", value: SAMPLE.timeFormatted },
          { label: "Ort", value: SAMPLE.location },
        ],
      }),
    }),
  },

  // ── Ärzt:innen — Kursbuchung ───────────────────────────────────────
  {
    id: "course-confirmation-online",
    funnel: "arzt-kursbuchung",
    name: "Buchungsbestätigung Onlinekurs",
    recipient: "Ärzt:in",
    trigger: "Stripe-Webhook nach erfolgreicher Onlinekurs-Zahlung",
    codeRef: "src/lib/post-purchase.ts",
    description:
      "Willkommensmail für den Onlinekurs mit Hinweis zum EPHIA-Zugang und Lern-Login.",
    renderSample: () => ({
      subject: `Buchungsbestätigung: ${SAMPLE.courseTitle}`,
      html: buildOnlinekursEmail(SAMPLE.firstName, SAMPLE.courseTitle),
    }),
  },
  {
    id: "course-confirmation-praxis",
    funnel: "arzt-kursbuchung",
    name: "Buchungsbestätigung Praxiskurs",
    recipient: "Ärzt:in",
    trigger: "Stripe-Webhook nach erfolgreicher Praxiskurs-Zahlung",
    codeRef: "src/lib/post-purchase.ts",
    description:
      "Bestätigung des Praxiskurses inkl. Kursort, Dozent:in, Proband:innen-Info und Rechnungsinfo.",
    renderSample: () => ({
      subject: `Buchungsbestätigung: ${SAMPLE.courseTitle}`,
      html: buildPraxiskursEmail(
        SAMPLE.firstName,
        SAMPLE.courseTitle,
        SAMPLE_PRAXIS_INFO,
        { hasOnlineCourse: true },
      ),
    }),
  },
  {
    id: "course-confirmation-kombi",
    funnel: "arzt-kursbuchung",
    name: "Buchungsbestätigung Kombikurs / Komplettpaket",
    recipient: "Ärzt:in",
    trigger:
      "Stripe-Webhook nach erfolgreicher Kombi- oder Premium-Kurs-Zahlung",
    codeRef: "src/lib/post-purchase.ts",
    description:
      "Bestätigung des Kombikurses mit sowohl Online- als auch Praxisteil. Wird auch für das Premium Komplettpaket verwendet.",
    renderSample: () => ({
      subject: `Buchungsbestätigung: ${SAMPLE.courseTitle}`,
      html: buildKombikursEmail(
        SAMPLE.firstName,
        SAMPLE.courseTitle,
        SAMPLE_PRAXIS_INFO,
        { hasOnlineCourse: true },
      ),
    }),
  },
  {
    id: "community-invite",
    funnel: "arzt-kursbuchung",
    name: "Community-Einladung",
    recipient: "Ärzt:in",
    trigger:
      "Direkt nach jeder Kursbuchung (Online, Praxis, Kombi, Premium)",
    codeRef: "src/lib/post-purchase.ts",
    description:
      "Lädt Käufer:innen in die WhatsApp-Community ein und erklärt, wie sie beitreten können.",
    renderSample: () => ({
      subject: "Willkommen in der EPHIA-Community!",
      html: buildCommunityInviteEmail(SAMPLE.firstName),
    }),
  },
  {
    id: "probandinnen-info",
    funnel: "arzt-kursbuchung",
    name: "Proband:innen-Info (nächster Schritt)",
    recipient: "Ärzt:in",
    trigger:
      "Nach Buchung eines Kurses mit Praxisanteil (Praxis, Kombi, Premium)",
    codeRef: "src/lib/post-purchase.ts",
    description:
      "Erklärt die Proband:innen-Organisation und lädt ein, selbst eine:n Proband:in mitzubringen.",
    renderSample: () => ({
      subject: "Nächster Schritt: Proband:innen für Deinen Praxiskurs",
      html: buildProbandinnenInfoEmail(SAMPLE.firstName),
    }),
  },
  {
    id: "invoice",
    funnel: "arzt-kursbuchung",
    name: "Rechnung",
    recipient: "Ärzt:in",
    trigger:
      "Stripe-Webhook `invoice.paid` — nach bestätigter Zahlung der Rechnung",
    codeRef: "src/app/api/stripe-webhook/route.ts",
    description:
      "Stellt die Stripe-Rechnung als PDF-Anhang bereit, sobald die Zahlung final bestätigt ist.",
    renderSample: () => ({
      subject: "Deine EPHIA-Rechnung",
      html: buildInvoiceEmail(SAMPLE.firstName),
    }),
  },

  // ── Ärzt:innen — Updates & Stornierung ─────────────────────────────
  {
    id: "session-change",
    funnel: "arzt-kursupdates",
    name: "Terminänderung Kurstermin",
    recipient: "Ärzt:in",
    trigger:
      "Admin ändert Datum, Uhrzeit, Ort oder Dozent:in eines Kurstermins",
    codeRef: "src/app/api/send-session-change-email/route.ts",
    description:
      "Aktualisierte Kursdetails (Datum, Start, Ende, Ort, Dozent:in) nach einer Terminverschiebung.",
    renderSample: () => ({
      subject: `Terminänderung: ${SAMPLE.courseTitle}`,
      html: buildSessionChangeEmail(SAMPLE.firstName, SAMPLE.courseTitle, {
        address: SAMPLE.address,
        dateFormatted: SAMPLE.dateFormatted,
        startTime: SAMPLE.startTime,
        endTime: SAMPLE.endTime,
        instructor: SAMPLE.instructor,
      }),
    }),
  },
  {
    id: "course-booking-cancellation",
    funnel: "arzt-kursupdates",
    name: "Kursbuchung storniert",
    recipient: "Ärzt:in",
    trigger:
      "Stornierung einer Kursbuchung (mit oder ohne Rückerstattung/Stornorechnung)",
    codeRef: "src/app/api/cancel-course-booking/route.ts",
    description:
      "Bestätigung der Stornierung. Bei Rückerstattung mit Link zur Stornorechnung.",
    renderSample: () => ({
      subject: "Deine Buchung wurde storniert",
      html: buildEmailHtml({
        firstName: SAMPLE.firstName,
        intro: `Deine Buchung für den Kurs <strong>${SAMPLE.courseTitle}</strong> am <strong>${SAMPLE.dateFormatted}</strong> wurde storniert.`,
        infoRows: [
          {
            label: "Stornorechnung",
            value: `<a href="https://invoice.stripe.com/i/..." style="color:#0066FF;">Herunterladen</a>`,
          },
        ],
        note: "Falls Du Fragen hast, melde Dich gerne bei uns.",
      }),
    }),
  },

  // ── Kontakt & Anfragen ─────────────────────────────────────────────
  {
    id: "group-inquiry",
    funnel: "kontakt",
    name: "Gruppenbuchungsanfrage",
    recipient: "Staff",
    trigger:
      "Formular-Absendung auf der Kurs-Landingpage (Gruppenbuchung)",
    codeRef: "src/app/api/group-inquiry/route.ts",
    description:
      "Interne Benachrichtigung an customerlove@ephia.de mit den Details der Gruppenanfrage.",
    renderSample: () => ({
      subject: `Gruppenbuchungsanfrage: ${SAMPLE.courseTitle}`,
      html: `<!doctype html>
<html lang="de">
  <body style="margin:0; padding:0; background:#f6f6f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="max-width:640px; margin:0 auto; padding:24px;">
      <div style="background:#ffffff; border-radius:10px; padding:28px;">
        <h1 style="margin:0 0 8px; font-size:22px; color:#000;">Neue Gruppenbuchungsanfrage</h1>
        <p style="margin:0 0 20px; color:#555; font-size:14px;">Über das Formular auf der Kurs-Landingpage eingegangen.</p>
        <table style="width:100%; border-collapse:separate; border-spacing:0 6px; font-size:14px;">
          <tr><td style="background:#faebe1; padding:10px 14px; font-weight:600; width:180px;">Name</td><td style="padding:10px 14px;">${SAMPLE.firstName} ${SAMPLE.lastName}</td></tr>
          <tr><td style="background:#faebe1; padding:10px 14px; font-weight:600;">E-Mail</td><td style="padding:10px 14px;">anna@example.com</td></tr>
          <tr><td style="background:#faebe1; padding:10px 14px; font-weight:600;">Telefon</td><td style="padding:10px 14px;">+49 160 0000000</td></tr>
          <tr><td style="background:#faebe1; padding:10px 14px; font-weight:600;">Kurs</td><td style="padding:10px 14px;">${SAMPLE.courseTitle}</td></tr>
          <tr><td style="background:#faebe1; padding:10px 14px; font-weight:600;">Teilnehmer:innen</td><td style="padding:10px 14px;">4</td></tr>
          <tr><td style="background:#faebe1; padding:10px 14px; font-weight:600;">Nachricht</td><td style="padding:10px 14px;">Wir wären an einem Termin im Juni interessiert.</td></tr>
        </table>
      </div>
      <p style="text-align:center; color:#999; font-size:12px; margin-top:16px;">
        Antworte direkt auf diese E-Mail, um mit der anfragenden Person Kontakt aufzunehmen.
      </p>
    </div>
  </body>
</html>`,
    }),
  },
  {
    id: "contact-message",
    funnel: "kontakt",
    name: "Kontaktanfrage",
    recipient: "Staff",
    trigger:
      "Formular-Absendung auf /kurse/faq-kontakt (allgemeine Kontaktanfrage)",
    codeRef: "src/app/api/contact-message/route.ts",
    description:
      "Interne Benachrichtigung an customerlove@ephia.de mit der Kontaktnachricht.",
    renderSample: () => ({
      subject: `Kontaktanfrage von ${SAMPLE.firstName} ${SAMPLE.lastName}`,
      html: `<!doctype html>
<html lang="de">
  <body style="margin:0; padding:0; background:#f6f6f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="max-width:640px; margin:0 auto; padding:24px;">
      <div style="background:#ffffff; border-radius:10px; padding:28px;">
        <h1 style="margin:0 0 8px; font-size:22px; color:#000;">Neue Kontaktanfrage</h1>
        <p style="margin:0 0 20px; color:#555; font-size:14px;">Über das Formular auf /kurse/faq-kontakt eingegangen.</p>
        <table style="width:100%; border-collapse:separate; border-spacing:0 6px; font-size:14px;">
          <tr><td style="background:#faebe1; padding:10px 14px; font-weight:600; width:180px;">Name</td><td style="padding:10px 14px;">${SAMPLE.firstName} ${SAMPLE.lastName}</td></tr>
          <tr><td style="background:#faebe1; padding:10px 14px; font-weight:600;">E-Mail</td><td style="padding:10px 14px;">anna@example.com</td></tr>
          <tr><td style="background:#faebe1; padding:10px 14px; font-weight:600;">Nachricht</td><td style="padding:10px 14px;">Hallo, wann findet der nächste Grundkurs Botulinum statt?</td></tr>
          <tr><td style="background:#faebe1; padding:10px 14px; font-weight:600;">Seite</td><td style="padding:10px 14px;">https://kurse.ephia.de/faq-kontakt</td></tr>
        </table>
      </div>
      <p style="text-align:center; color:#999; font-size:12px; margin-top:16px;">
        Antworte direkt auf diese E-Mail.
      </p>
    </div>
  </body>
</html>`,
    }),
  },
];

export function getTransactionalEmailById(
  id: string,
): TransactionalEmail | undefined {
  return TRANSACTIONAL_EMAILS.find((e) => e.id === id);
}

export function groupTransactionalEmails(): {
  funnel: FunnelKey;
  label: string;
  emails: TransactionalEmail[];
}[] {
  return FUNNEL_ORDER.map((funnel) => ({
    funnel,
    label: FUNNEL_LABELS[funnel],
    emails: TRANSACTIONAL_EMAILS.filter((e) => e.funnel === funnel),
  })).filter((g) => g.emails.length > 0);
}
