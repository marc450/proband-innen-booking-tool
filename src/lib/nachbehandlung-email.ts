import { buildEmailHtml, PATIENT_PREPARATION_BLOCK } from "@/lib/email-template";

/**
 * Terminbestätigung für eine kostenlose Nachbehandlung.
 *
 * Staff legt im Kurs-Detail einen Nachbehandlungs-Slot an und weist eine:n
 * bestehende:n Proband:in zu. Diese:r erhält die Bestätigung hier. Die
 * Nachbehandlung ist immer kostenlos, das wird sowohl im Fließtext als auch
 * als eigene Info-Zeile klar gemacht.
 *
 * Zentraler Builder, damit der Live-Versand (/api/nachbehandlung) und die
 * Vorschau im Admin-Katalog (transactional-emails.ts) garantiert dasselbe
 * rendern.
 */
export function buildNachbehandlungEmail({
  firstName,
  dateStr,
  timeStr,
  location,
}: {
  firstName: string;
  dateStr: string;
  timeStr: string;
  location: string;
}): { subject: string; html: string } {
  const extraContent = `
    <p style="margin:0 0 20px;">
      Deine Nachbehandlung ist für Dich <strong>kostenlos</strong>. Es entstehen keine weiteren Kosten.
    </p>

    ${PATIENT_PREPARATION_BLOCK}

    <p style="margin:20px 0 4px; font-weight:bold;">Unsere Teilnahmebedingungen</p>
    <p style="margin:0 0 20px;">
      Du hast bei Deiner Buchung unsere Allgemeinen Teilnahmebedingungen für Proband:innen bestätigt. Wenn Du sie noch einmal nachlesen oder Deinen Termin umbuchen bzw. stornieren möchtest, findest Du alle Regeln hier:
      <br>
      <a href="https://ephia.de/proband-agb" style="color:#0066FF; text-decoration:underline;">https://ephia.de/proband-agb</a>
    </p>

    <p style="margin:0 0 20px;">
      Solltest Du weitere Fragen haben, melde Dich jederzeit bei uns:
      <a href="mailto:customerlove@ephia.de" style="color:#0066FF; text-decoration:none;">customerlove@ephia.de</a>
    </p>
  `;

  const html = buildEmailHtml({
    firstName,
    intro:
      "Dein Termin zur Nachbehandlung ist bestätigt. Hier sind alle Details auf einen Blick:",
    infoRows: [
      { label: "Termin", value: "Nachbehandlung" },
      { label: "Datum", value: dateStr },
      { label: "Uhrzeit", value: timeStr ? `${timeStr} Uhr` : "" },
      { label: "Ort", value: location },
      { label: "Kosten", value: "kostenlos" },
    ],
    extraContent,
  });

  return { subject: "Terminbestätigung: Nachbehandlung", html };
}
