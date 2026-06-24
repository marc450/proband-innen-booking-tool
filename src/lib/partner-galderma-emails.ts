// The three emails of the Galderma consent flow:
//   1. Confirmation to the participant (Art. 7 proof pillar), sent right
//      after they sign on the tablet. Carries the Widerruf link.
//   2. Withdrawal forwarder to Galderma, sent when someone revokes
//      (Art. 17 Abs. 2 Mitteilungspflicht).
//   3. Export to Galderma with the Excel attachment (sent by the cron).
//
// All three use the same From/Reply-To and the Galderma inbox (To + CC).

import { buildEmailHtml } from "@/lib/email-template";
import { archiveSentMessage } from "@/lib/gmail";
import {
  GALDERMA_FROM,
  GALDERMA_REPLY_TO,
  GALDERMA_RECIPIENT_TO,
  GALDERMA_RECIPIENT_CC,
  GALDERMA_ENTITY,
  GALDERMA_CONTACT,
  GALDERMA_PURPOSES,
} from "@/lib/partner-galderma";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const DOCTOR_HOST = "https://ephia.de";

interface ResendAttachment {
  filename: string;
  content: string; // base64
}

interface SendResult {
  ok: boolean;
  messageId: string | null;
  error?: string;
}

async function resendSend(args: {
  to: string;
  cc?: string[];
  subject: string;
  html: string;
  attachments?: ResendAttachment[];
  archive?: boolean;
}): Promise<SendResult> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: GALDERMA_FROM,
      to: args.to,
      ...(args.cc && args.cc.length ? { cc: args.cc } : {}),
      reply_to: GALDERMA_REPLY_TO,
      subject: args.subject,
      html: args.html,
      ...(args.attachments ? { attachments: args.attachments } : {}),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "<unreadable>");
    console.error(`Resend rejected "${args.subject}": ${res.status} ${detail}`);
    return { ok: false, messageId: null, error: `${res.status} ${detail}` };
  }
  const data = (await res.json().catch(() => ({}))) as { id?: string };

  // Mirror into the shared Gmail "Sent" archive like the other transactional
  // sends, so the data-protection trail is visible there too. Non-fatal.
  if (args.archive !== false) {
    try {
      await archiveSentMessage({
        to: args.to,
        subject: args.subject,
        html: args.html,
        attachments: args.attachments?.map((a) => ({
          filename: a.filename,
          mimeType: "application/octet-stream",
          content: a.content,
        })),
      });
    } catch (err) {
      console.error("archiveSentMessage failed (non-fatal):", err);
    }
  }

  return { ok: true, messageId: data.id ?? null };
}

// ── 1. Participant confirmation ─────────────────────────────────────────────
export function buildConsentConfirmationEmail(args: {
  firstName: string;
  courseTitle: string;
  courseDate: string;
  betreuerName: string | null;
  withdrawalToken: string;
}): { subject: string; html: string } {
  const withdrawUrl = `${DOCTOR_HOST}/widerruf-datenweitergabe/${args.withdrawalToken}`;
  const betreuer = args.betreuerName ? ` (${args.betreuerName})` : "";

  const intro =
    `danke, dass Du beim Kurs <strong>${args.courseTitle}</strong> am ` +
    `<strong>${args.courseDate}</strong> dabei warst. Beim Abschluss des Kurses ` +
    `hast Du gegenüber unserer Kursbetreuung${betreuer} per Unterschrift ` +
    `eingewilligt, dass wir Deine Kontaktdaten an die ${GALDERMA_ENTITY.name} ` +
    `(${GALDERMA_ENTITY.address}) weitergeben dürfen. Mit dieser E-Mail ` +
    `dokumentieren wir das transparent für Dich.`;

  const purposeList = GALDERMA_PURPOSES.map((p) => `<li>${p}</li>`).join("");

  const extraContent = `
    <p style="margin:0 0 6px; font-weight:bold;">Was wir weitergeben</p>
    <ul style="margin:0 0 16px; padding-left:20px;">
      <li>Vor- und Nachname</li>
      <li>E-Mail-Adresse</li>
      <li>Anschrift und Telefonnummer</li>
      <li>Information, an welchem EPHIA-Kurs Du teilgenommen hast</li>
    </ul>
    <p style="margin:0 0 6px; font-weight:bold;">Wofür Galderma die Daten nutzt</p>
    <ul style="margin:0 0 16px; padding-left:20px;">${purposeList}</ul>
    <p style="margin:0 0 16px;">
      Wenn die Angaben oben so stimmen, musst Du nichts tun. Den Widerruf
      kannst Du jederzeit über den Button erklären. Er wirkt sich nicht auf
      die Rechtmäßigkeit der bis dahin erfolgten Verarbeitung aus.
      Ausführliche Informationen findest Du in unserer Datenschutzerklärung
      unter <a href="${DOCTOR_HOST}/datenschutz#partner-datenweitergabe" style="color:#0066FF;">${DOCTOR_HOST}/datenschutz</a>.
    </p>`;

  const html = buildEmailHtml({
    firstName: args.firstName || "Du",
    intro,
    extraContent,
    buttons: [{ label: "Einwilligung widerrufen", url: withdrawUrl }],
    note: "Deine Einwilligung ist freiwillig und jederzeit mit Wirkung für die Zukunft widerrufbar, ohne dass Dir dadurch Nachteile entstehen.",
  });

  return {
    subject: `Bestätigung Deiner Einwilligung: Datenweitergabe an ${GALDERMA_ENTITY.name}`,
    html,
  };
}

export async function sendConsentConfirmationEmail(args: {
  to: string;
  firstName: string;
  courseTitle: string;
  courseDate: string;
  betreuerName: string | null;
  withdrawalToken: string;
}): Promise<SendResult> {
  const { subject, html } = buildConsentConfirmationEmail(args);
  return resendSend({ to: args.to, subject, html });
}

// ── 1b. Withdrawal confirmation to the participant ──────────────────────────
export function buildWithdrawalConfirmationEmail(args: {
  firstName: string;
}): { subject: string; html: string } {
  const html = buildEmailHtml({
    firstName: args.firstName || "Du",
    intro:
      `wir bestätigen Dir den Widerruf Deiner Einwilligung zur Weitergabe Deiner ` +
      `Kontaktdaten an die ${GALDERMA_ENTITY.name}. Wir geben Deine Daten nicht ` +
      `weiter. Falls wir Deine Daten zuvor bereits übermittelt hatten, haben wir ` +
      `Galderma aufgefordert, sie zu löschen.`,
    note: "Der Widerruf wirkt sich nicht auf die Rechtmäßigkeit der bis dahin erfolgten Verarbeitung aus.",
  });

  return { subject: "Dein Widerruf ist bestätigt", html };
}

export async function sendWithdrawalConfirmationEmail(args: {
  to: string;
  firstName: string;
}): Promise<SendResult> {
  const { subject, html } = buildWithdrawalConfirmationEmail(args);
  return resendSend({ to: args.to, subject, html });
}

// ── 1c. Galderma contact intro to the participant (24h after consent) ───────
// Sent 24h after the doctor signs the consent: introduces their personal
// Galderma contact so they know whom to reach, and that she can name the
// right Außendienstmitarbeiter:in for a practice visit. Goes to the doctor,
// not to Galderma.
export function buildGaldermaContactIntroEmail(args: {
  firstName: string;
  courseTitle?: string | null;
}): { subject: string; html: string } {
  const kursTeil = args.courseTitle
    ? `Deines Kurses <strong>${args.courseTitle}</strong>`
    : "Deines EPHIA-Kurses";

  const intro =
    `Du hast beim Abschluss ${kursTeil} eingewilligt, dass wir Deine ` +
    `Kontaktdaten an die ${GALDERMA_ENTITY.name} weitergeben dürfen. ` +
    `Damit Du von Anfang an weißt, an wen Du Dich wenden kannst, stellen ` +
    `wir Dir hier Deine persönliche Ansprechpartnerin bei Galderma vor.`;

  const html = buildEmailHtml({
    firstName: args.firstName || "Du",
    intro,
    infoRows: [
      { label: "Ansprechpartnerin", value: GALDERMA_CONTACT.name },
      { label: "Funktion", value: GALDERMA_CONTACT.role },
      { label: "E-Mail", value: GALDERMA_CONTACT.email },
    ],
    note:
      `Falls Du einen Besuch in Deiner Praxis wünschst, benennt Dir ` +
      `${GALDERMA_CONTACT.name} gerne die richtige Außendienstmitarbeiter:in ` +
      `für Deine Region. Melde Dich dafür einfach direkt bei ihr.`,
  });

  return {
    subject: `Deine Ansprechpartnerin bei ${GALDERMA_ENTITY.name}`,
    html,
  };
}

export async function sendGaldermaContactIntroEmail(args: {
  to: string;
  firstName: string;
  courseTitle?: string | null;
}): Promise<SendResult> {
  const { subject, html } = buildGaldermaContactIntroEmail(args);
  return resendSend({ to: args.to, subject, html });
}

// ── 2. Withdrawal forwarder to Galderma ─────────────────────────────────────
export async function sendWithdrawalForwardEmail(args: {
  firstName: string;
  lastName: string;
  email: string;
  courseTitle: string;
  courseDate: string;
  exportDate: string | null;
}): Promise<SendResult> {
  const fullName = `${args.firstName} ${args.lastName}`.trim();
  const exportedLine = args.exportDate
    ? `die wir Euch am ${args.exportDate} zugesendet haben`
    : "die wir Euch zugesendet haben";

  const html = buildEmailHtml({
    firstName: "Galderma-Team",
    intro:
      `bitte entfernt folgenden Kontakt umgehend aus der Datenliste, ${exportedLine}:`,
    infoRows: [
      { label: "Name", value: fullName || "—" },
      { label: "E-Mail", value: args.email || "—" },
      { label: "Kurs", value: `${args.courseTitle} am ${args.courseDate}` },
      { label: "Grund", value: "Widerruf der Einwilligung durch die betroffene Person" },
    ],
    note: "Eine Bestätigung der Löschung wäre hilfreich, ist aber nicht erforderlich.",
    closing: "Viele Grüße,<br>EPHIA Datenschutzteam",
  });

  return resendSend({
    to: GALDERMA_RECIPIENT_TO,
    cc: GALDERMA_RECIPIENT_CC,
    subject: `Widerruf Galderma-Datenweitergabe: ${fullName || args.email}`,
    html,
  });
}

// ── 3. Export to Galderma with Excel attachment ─────────────────────────────
export async function sendGaldermaExportEmail(args: {
  courseTitle: string;
  courseDate: string;
  participantCount: number;
  xlsxFilename: string;
  xlsxBase64: string;
}): Promise<SendResult> {
  const html = buildEmailHtml({
    firstName: "Galderma-Team",
    intro:
      `anbei die Liste der Teilnehmer:innen des Kurses ` +
      `<strong>${args.courseTitle}</strong> vom <strong>${args.courseDate}</strong>, ` +
      `die einer Datenweitergabe an die ${GALDERMA_ENTITY.name} ausdrücklich ` +
      `zugestimmt haben.`,
    infoRows: [
      { label: "Anzahl Datensätze", value: String(args.participantCount) },
      { label: "Datei", value: args.xlsxFilename },
    ],
    closing: "Viele Grüße,<br>EPHIA Datenschutzteam",
  });

  return resendSend({
    to: GALDERMA_RECIPIENT_TO,
    cc: GALDERMA_RECIPIENT_CC,
    subject: `EPHIA Teilnehmerliste: ${args.courseTitle} vom ${args.courseDate}`,
    html,
    attachments: [{ filename: args.xlsxFilename, content: args.xlsxBase64 }],
  });
}
