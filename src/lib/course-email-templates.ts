import { getProfileUrlByName } from "@/content/kurse/team";

const LOGO_URL =
  "https://lwfiles.mycourse.app/6638baeec5c56514e03ec360-public/f64a1ea1eb5346a171fe9ea36e8615ca.png";

const FOOTER = `
    <div style="margin-top:12px; padding-top:12px; text-align:left;">
      <img src="${LOGO_URL}" alt="EPHIA-Logo" style="width:200px; height:auto; display:block; margin:0 0 6px;">
      <div style="color:#9e9e9e; font-size:12px; line-height:1.4;">
        EPHIA Medical GmbH<br>
        Dorfstraße 30, 15913 Märkische Heide, Deutschland<br>
        Geschäftsführerin: Dr. Sophia Wilk-Vollmann
      </div>
    </div>`;

const RECHNUNG_SECTION = `
    <h3 style="margin:16px 0 10px;font-size:16px;font-weight:bold;">Deine Rechnung</h3>
    <p style="margin:0 0 20px;">
      Deine Rechnung senden wir Dir in einer separaten E-Mail automatisch zu, sobald Deine Zahlung bestätigt wurde. Bitte beachte, dass dieser Prozess bei SEPA-Bezahlungen bis zu zwei Wochen dauern kann.
    </p>`;

// Body of the "set your password" call-to-action, shared between the
// Onlinekurs, Praxiskurs, and Kombikurs confirmation emails so the
// copy stays in lockstep. The customer is brand new in Supabase Auth
// at this point (no auth user yet); /start runs the lazy-migration
// flow that asks for an email + password and creates the account on
// submit.
const LOGIN_SETUP_BODY = `
    <p style="margin:0 0 16px;">
      Mit Deiner Kursbuchung haben wir Deinen EPHIA-Zugang für Dich vorbereitet. Lege jetzt Dein Passwort fest, dann findest Du Deinen Kurs jederzeit in Deinem persönlichen Dashboard.
    </p>
    <p style="margin:0 0 20px;">
      <a href="https://ephia.de/start" style="display:inline-block;background-color:#0066FF;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;">
        Jetzt Passwort festlegen
      </a>
    </p>
    <p style="margin:0 0 20px;">
      Hast Du bereits ein EPHIA-Konto, melde Dich einfach mit Deinen bestehenden Zugangsdaten an. Dein neuer Kurs erscheint automatisch in Deinem Dashboard.
    </p>`;

const MONTHS_DE_FULL = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

export function formatDateDe(dateIso: string): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  return `${String(d).padStart(2, "0")}. ${MONTHS_DE_FULL[m - 1]} ${y}`;
}

function praxiskursInfoBox({
  address,
  dateFormatted,
  startTime,
  endTime,
  instructor,
}: {
  address: string;
  dateFormatted: string;
  startTime: string;
  endTime: string;
  instructor: string;
}) {
  return `
    <div style="border-radius:8px; padding:14px 16px; background-color:#FAEBE1; border:1px solid #F0D0B8; font-size:14px; margin:0 0 20px; text-align:left;">
      <p style="margin:0 0 6px;">
        <span style="font-weight:bold;">Kursort:</span> ${address}
      </p>
      <p style="margin:0 0 6px;">
        <span style="font-weight:bold;">Datum:</span> ${dateFormatted}
      </p>
      <p style="margin:0 0 6px;">
        <span style="font-weight:bold;">Beginn:</span> ${startTime} Uhr
      </p>
      <p style="margin:0;">
        <span style="font-weight:bold;">Voraussichtliches Kursende:</span> ${endTime} Uhr
      </p>
      <div style="margin-top:10px; padding-top:8px; border-top:1px solid #F0D0B8;">
        <p style="margin:0;">
          <span style="font-weight:bold;">Dein:e Dozent:in:</span>
          <a href="${getProfileUrlByName(instructor) ?? "https://ephia.de/team"}" style="color:#0066FF; text-decoration:none;">${instructor}</a>
        </p>
      </div>
    </div>`;
}

const PROBANDINNEN_SECTION = `
    <h3 style="margin:16px 0 10px;font-size:16px;font-weight:bold;">Bring Deine:n eigene:n Proband:in mit</h3>
    <p style="margin:0 0 12px;">
      Wir empfehlen jeder:m Teilnehmer:in nachdrücklich, eine:n eigene:n Proband:in zum Praxistag mitzubringen. Das hat zwei Gründe:
    </p>
    <ul style="margin:0 0 16px 24px; padding:0;">
      <li style="margin-bottom:8px;"><strong>Bessere Behandlung.</strong> Wenn Du Anamnese und Indikation Deiner Proband:in vorab kennst, gehst Du strukturierter in den Praxisteil, statt sie erst im Kurs zu erfassen.</li>
      <li style="margin-bottom:8px;"><strong>Verlässliche Planung.</strong> Unser Proband:innen-Pool ergänzt jeden Kurs, ist aber bewusst nicht so dimensioniert, dass er allein alle Teilnehmer:innen abdeckt. Wer jemanden mitbringt, hat den Behandlungsplatz sicher.</li>
    </ul>
    <p style="margin:0 0 16px;">
      <strong>Pro Teilnehmer:in kann maximal ein:e eigene:r Proband:in eingebracht werden.</strong>
    </p>
    <p style="margin:0 0 16px;">
      Leite den folgenden Link bitte direkt an Deine:n Proband:in weiter: <a href="https://proband-innen.ephia.de/book/privat" style="color:#0066FF;text-decoration:none;">https://proband-innen.ephia.de/book/privat</a>. Die Registrierung muss persönlich durch Deine:n Proband:in erfolgen, da AGB und Datenschutzerklärung bestätigt werden müssen. Über diesen Link ist die Buchung kostenfrei. Schnelles Handeln ist wichtig, da unsere Termine parallel öffentlich vergeben werden.
    </p>
    <p style="margin:0 0 20px;">
      Sobald Dein:e Proband:in über den Link registriert ist, erhält die Person sofort eine Buchungsbestätigung mit allen relevanten Informationen: genaue Adresse, Ankunftszeit, Behandlungsdetails und Vorbereitungshinweise. <strong>72 und 24 Stunden vor dem Termin</strong> verschicken wir zusätzlich automatische Erinnerungen. Bitte denke bei der Auswahl an Personen mit mehreren möglichen Indikationen, damit vor Ort möglichst viele Behandlungstechniken gezeigt und geübt werden können. Achte dabei auf bekannte Kontraindikationen.
    </p>`;

const VORAUSSETZUNG_SECTION = `
    <h3 style="margin:16px 0 10px;font-size:16px;font-weight:bold;">Voraussetzung zur Kursteilnahme: Starkes theoretisches Wissen</h3>
    <p style="margin:0 0 20px;">
      Damit wir im Praxisteil direkt tief in die Behandlung einsteigen können, ist die Teilnahme nur möglich, wenn Du den zugehörigen Onlinekurs vollständig abgeschlossen hast. So stellen wir sicher, dass alle Teilnehmer:innen auf einem vergleichbaren Wissensstand sind und die praktische Ausbildung auf fachlich höchstem Niveau stattfinden kann.
    </p>`;

interface PraxisInfo {
  address: string;
  dateFormatted: string;
  startTime: string;
  endTime: string;
  instructor: string;
}

export function buildOnlinekursEmail(firstName: string, courseName: string): string {
  return `<div style="background-color:#fff; padding:0; font-family:Arial, sans-serif;">
  <div style="background-color:#fff; max-width:600px; margin:0 auto; padding:8px; text-align:left; line-height:1.5;">
    <p style="margin-top:0; margin-bottom:20px;">
      Hi ${firstName},<br><br>
      toll, dass Du Dich für den <strong>${courseName}</strong> entschieden hast!<br>
      Wir freuen uns sehr darauf, Dich auf Deinem Weg in die minimal-invasive, ästhetische Medizin zu begleiten – mit einem Blick für Diversität, individuelle Bedürfnisse Deiner Patient:innen und sichere, evidenzbasierte Behandlungskonzepte.
    </p>

    <h3 style="margin:16px 0 10px;font-size:16px;font-weight:bold;">So startest Du mit dem Kurs</h3>
    ${LOGIN_SETUP_BODY}

    <h3 style="margin:16px 0 10px;font-size:16px;font-weight:bold;">Tipps für Deine Lernreise</h3>
    <p style="margin:0 0 20px;">
      Unser Onlinekurs ist so aufgebaut, dass Du Theorie, klinische Relevanz und praktische Anwendung gut miteinander verbinden kannst. Wir empfehlen Dir, die Module in Ruhe und in der vorgesehenen Reihenfolge zu bearbeiten und Dir Notizen zu typischen Indikationen, Dosierungen und Diskussionspunkten für Deine Patient:innen zu machen.
      <br><br>
      Wenn Du den Kurs zur Vorbereitung auf einen späteren Praxiskurs nutzt, schau Dir besonders die Kapitel zu Anatomie, Komplikationsmanagement und Aufklärungsgesprächen sorgfältig an – sie bilden die Grundlage für den sicheren Umgang mit Botulinum und Dermalfillern am realen Fall.
    </p>

    ${RECHNUNG_SECTION}

    <h3 style="margin:16px 0 10px;font-size:16px;font-weight:bold;">Support & Fragen</h3>
    <p style="margin:0 0 20px;">
      Wenn unterwegs Fragen auftauchen – fachlich, technisch oder organisatorisch – melde Dich jederzeit bei uns unter <a href="mailto:customerlove@ephia.de" style="color:#0066FF;text-decoration:none;">customerlove@ephia.de</a>. Wir unterstützen Dich gerne dabei, die Inhalte sicher in Deinen ärztlichen Alltag zu integrieren.
    </p>

    <p style="margin:0 0 20px;">
      Wir wünschen Dir viel Freude beim Lernen und freuen uns, Dich bald als Teil der EPHIA-Community zu sehen.
    </p>
    <p style="margin:0 0 20px;">
      Herzliche Grüße,<br>
      Dein EPHIA-Team
    </p>

    ${FOOTER}
  </div>
</div>`;
}

export function buildPraxiskursEmail(firstName: string, courseName: string, praxis: PraxisInfo, opts?: { hasOnlineCourse?: boolean }): string {
  return `<div style="background-color:#fff; padding:0; font-family:Arial, sans-serif;">
  <div style="background-color:#fff; max-width:600px; margin:0 auto; padding:8px; text-align:left; line-height:1.5;">
    <p style="margin-top:0; margin-bottom:20px;">
      Hi ${firstName},<br><br>
      toll, dass Du Dich für den <strong>${courseName}</strong> von uns entschieden hast!<br>
      Wir freuen uns sehr darauf, Dich auf Deinem Weg in die minimal-invasive, ästhetische Medizin zu begleiten – mit einem Blick für Diversität, individuelle Bedürfnisse Deiner Patient:innen und sichere, evidenzbasierte Behandlungskonzepte.
    </p>

    <h2 style="margin:16px 0 10px;font-size:20px;font-weight:bold;">Dein Praxiskurs</h2>
    <p style="margin:0 0 20px;">
      Hier siehst Du alle wichtigen Daten zu Deinem Praxiskurs auf einen Blick:
    </p>

    ${praxiskursInfoBox(praxis)}

    <p style="margin:0 0 20px;">
       Bitte plane ein, ein paar Minuten vor Kursstart vor Ort zu sein. Wir beginnen mit einer kurzen Vorstellungsrunde und der Möglichkeit, offene Fragen zum theoretischen Teil zu klären, bevor die ersten Proband:innen zur Behandlung eintreffen. Je nach Proband:innen-Anzahl und -Persönlichkeiten kann sich die Endzeit leicht verschieben.
    </p>

    ${opts?.hasOnlineCourse !== false ? VORAUSSETZUNG_SECTION : ""}

    <h3 style="margin:16px 0 10px;font-size:16px;font-weight:bold;">Dein EPHIA-Zugang</h3>
    ${LOGIN_SETUP_BODY}

    ${PROBANDINNEN_SECTION}
    ${RECHNUNG_SECTION}

    <p style="margin:0 0 20px;">
      Wenn Du vor dem Kurs noch Fragen, Unsicherheiten oder organisatorische Themen hast, schreib uns jederzeit an <a href="mailto:customerlove@ephia.de" style="color:#0066FF;text-decoration:none;">customerlove@ephia.de</a>. Wir sind für Dich da.
    </p>

    <p style="margin:0 0 20px;">
      Wir wünschen Dir viel Freude beim Lernen und freuen uns, Dich bald in der Praxis in der EPHIA-Community zu sehen.
    </p>
    <p style="margin:0 0 20px;">
      Herzliche Grüße,<br>
      Dein EPHIA-Team
    </p>

    ${FOOTER}
  </div>
</div>`;
}

export function buildKombikursEmail(firstName: string, courseName: string, praxis: PraxisInfo, opts?: { hasOnlineCourse?: boolean }): string {
  return `<div style="background-color:#fff; padding:0; font-family:Arial, sans-serif;">
  <div style="background-color:#fff; max-width:600px; margin:0 auto; padding:8px; text-align:left; line-height:1.5;">
    <p style="margin-top:0; margin-bottom:20px;">
      Hi ${firstName},<br><br>
      toll, dass Du Dich für den <strong>${courseName}</strong> von uns entschieden hast!<br>
      Wir freuen uns sehr darauf, Dich auf Deinem Weg in die minimal-invasive, ästhetische Medizin zu begleiten – mit einem Blick für Diversität, individuelle Bedürfnisse Deiner Patient:innen und sichere, evidenzbasierte Behandlungskonzepte.
    </p>

    ${opts?.hasOnlineCourse !== false ? `<h2 style="margin:16px 0 10px;font-size:20px;font-weight:bold;">Dein Onlinekurs</h2>
    ${LOGIN_SETUP_BODY}` : ""}

    <h2 style="margin:16px 0 10px;font-size:20px;font-weight:bold;">Dein Praxiskurs</h2>
    <p style="margin:0 0 20px;">Hier siehst Du alle wichtigen Daten zu Deinem Praxiskurs auf einen Blick:</p>

    ${praxiskursInfoBox(praxis)}

    <p style="margin:0 0 20px;">
       Bitte plane ein, ein paar Minuten vor Kursstart vor Ort zu sein. Wir beginnen mit einer kurzen Vorstellungsrunde und der Möglichkeit, offene Fragen zum ${opts?.hasOnlineCourse !== false ? "Onlinekurs" : "theoretischen Teil"} zu klären, bevor die ersten Proband:innen zur Behandlung eintreffen. Je nach Proband:innen-Anzahl und -Persönlichkeiten kann sich die Endzeit leicht verschieben.
    </p>

    ${opts?.hasOnlineCourse !== false ? VORAUSSETZUNG_SECTION : ""}
    ${PROBANDINNEN_SECTION}
    ${RECHNUNG_SECTION}

    <p style="margin:0 0 20px;">
      Wenn Du vor dem Kurs noch Fragen, Unsicherheiten oder organisatorische Themen hast, schreib uns jederzeit an <a href="mailto:customerlove@ephia.de" style="color:#0066FF;text-decoration:none;">customerlove@ephia.de</a>. Wir sind für Dich da.
    </p>

    <p style="margin:0 0 20px;">
      Wir wünschen Dir viel Freude beim Lernen und freuen uns, Dich bald ${opts?.hasOnlineCourse !== false ? "(online und in der Praxis) " : ""}in der EPHIA-Community zu sehen.
    </p>
    <p style="margin:0 0 20px;">
      Herzliche Grüße,<br>
      Dein EPHIA-Team
    </p>

    ${FOOTER}
  </div>
</div>`;
}

/**
 * Praxiskurs Proband:innen-Info email — second transactional email
 * sent to anyone who books a Praxiskurs, Kombikurs or Premium bundle.
 * Frames bringing an own Proband:in as the strongly recommended default;
 * the pool is positioned as a supplement, not a full substitute.
 */
export function buildProbandinnenInfoEmail(firstName: string): string {
  return `<div style="background-color:#fff; padding:0; font-family:Arial, sans-serif;">
  <div style="background-color:#fff; max-width:600px; margin:0 auto; padding:8px; text-align:left; line-height:1.5;">
    <p style="margin-top:0; margin-bottom:18px;">
      Hi ${firstName},
    </p>

    <p style="margin:0 0 18px;">
      ein wichtiger Hinweis vorab zu Deinem Praxiskurs: Wir empfehlen jeder:m Teilnehmer:in nachdrücklich, eine:n eigene:n Proband:in mitzubringen.
    </p>

    <p style="margin:0 0 18px;">
      Unser Proband:innen-Pool ergänzt zwar jeden Kurs, ist aber bewusst nicht so dimensioniert, dass er allein alle Teilnehmer:innen abdeckt. Wer jemanden mitbringt, hat den Behandlungsplatz sicher und kann Anamnese sowie Indikation vorab strukturiert klären, statt sie spontan im Kurs zu erfassen.
    </p>

    <p style="margin:0 0 18px;">
      <strong>Pro Teilnehmer:in kann maximal ein:e eigene:r Proband:in eingebracht werden.</strong>
    </p>

    <p style="margin:0 0 12px;">
      Schnelles Handeln ist entscheidend: Die offenen Slots werden parallel öffentlich vergeben und sind erfahrungsgemäß innerhalb weniger Tage vollständig ausgebucht. Sobald alle Plätze belegt sind, können wir keine Zuordnungen mehr vornehmen. Leite den folgenden Link bitte direkt an Deine:n Proband:in weiter:
    </p>
    <p style="margin:0 0 18px;">
      <a href="https://proband-innen.ephia.de/book/privat" style="display:inline-block; background-color:#0066FF; color:#fff; text-decoration:none; padding:12px 22px; border-radius:10px; font-weight:bold;">
        Zur Proband:innen-Registrierung
      </a>
    </p>

    <p style="margin:0 0 18px;">
      Die Registrierung muss persönlich durch Deine:n Proband:in erfolgen, da AGB und Datenschutzerklärung bestätigt werden müssen. Über diesen Link ist die Buchung kostenfrei.
    </p>

    <p style="margin:0 0 18px;">
      Zur Abrechnung: Medizinische Leistungen sind nach GOÄ abzurechnen. Da die Behandlung durch Dich erfolgt, liegt die ordnungsgemäße Abrechnung in Deiner Verantwortung.
    </p>

    <h3 style="margin:24px 0 10px; font-size:16px; font-weight:bold;">Voraussetzungen für Proband:innen</h3>
    <p style="margin:0 0 20px;">
      Volljährig, grundsätzlich gesund, keine Schwangerschaft oder Stillzeit, keine akuten Hauterkrankungen im Behandlungsareal sowie Einverständnis zur internen Fotodokumentation.
    </p>

    <p style="margin:0 0 20px;">
      Bei Fragen sind wir jederzeit für Dich da.
    </p>

    <p style="margin:0 0 20px;">
      Herzliche Grüße,<br>
      Dein EPHIA-Team
    </p>

    ${FOOTER}
  </div>
</div>`;
}

export function buildCommunityInviteEmail(firstName: string): string {
  return `<div style="background-color:#fff; padding:0; font-family:Arial, sans-serif;">
  <div style="background-color:#fff; max-width:600px; margin:0 auto; padding:8px; text-align:left; line-height:1.5;">
    <p style="margin-top:0; margin-bottom:20px;">
      Hi ${firstName},<br><br>
      wir möchten Dir in Deiner Einstiegsphase in die ästhetische Medizin eine verlässliche Anlaufstelle bieten, ob bei Fragen zu Indikationen, Behandlungsansätzen oder Abrechnung. Unsere Community ist das Herz von EPHIA: Hier diskutierst Du mit Kolleg:innen, erhältst Peer-Support und vertiefst Dein Wissen durch Materialien und Dozierende.<br><br>
      Sei dabei in unserer exklusiven WhatsApp-Community für Fachleute der ästhetischen Medizin: Vernetze Dich, teile Insights und bleibe up-to-date!
    </p>

    <p style="margin:0 0 24px 0;">
      <a href="https://chat.whatsapp.com/DfbOTDsWWksFQJhVOqdPJI" style="display:inline-block;background-color:#25D366;color:#fff;text-decoration:none;padding:12px 24px;border-radius:4px;font-weight:bold;">
        Jetzt der WhatsApp-Community beitreten
      </a>
    </p>

    <p style="margin:0 0 8px 0; font-weight:bold;">Darauf kannst Du Dich freuen:</p>
    <ul style="list-style-type:disc; padding-left:24px; margin:0 0 20px 0;">
      <li style="margin-bottom:4px;">Kontinuierlicher Austausch zu fachspezifischen Themen im Chat</li>
      <li style="margin-bottom:4px;">Regelmässige Online-Vorträge mit Gastreferent:innen</li>
      <li style="margin-bottom:4px;">Jederzeit Unterstützung und Tipps von Tutoren und Kolleg:innen</li>
      <li style="margin-bottom:4px;">Fallbesprechungen &amp; Updates zu neuen Trends und Studien</li>
    </ul>

    <p style="margin:0 0 20px 0;">
      Hast Du Fragen oder benötigst Hilfe beim Beitreten? Schreib uns gern an <a href="mailto:customerlove@ephia.de" style="color:#0066FF;text-decoration:none;">customerlove@ephia.de</a>.
    </p>

    <p style="margin:0 0 20px 0;">
      Wir freuen uns auf Deinen Input und den gemeinsamen Austausch!<br><br>
      Herzliche Grüße,<br>
      Dein EPHIA-Team
    </p>

    ${FOOTER}
  </div>
</div>`;
}

export function buildSessionChangeEmail(firstName: string, courseName: string, praxis: PraxisInfo): string {
  return `<div style="background-color:#fff; padding:0; font-family:Arial, sans-serif;">
  <div style="background-color:#fff; max-width:600px; margin:0 auto; padding:8px; text-align:left; line-height:1.5;">
    <p style="margin-top:0; margin-bottom:20px;">
      Hi ${firstName},<br><br>
      Dein Kurstermin wurde erfolgreich geändert. Hier sind Deine neuen Kursdetails:
    </p>

    ${praxiskursInfoBox(praxis)}

    <p style="margin:0 0 20px;">
      Falls Du Fragen hast, antworte uns einfach auf diese E-Mail.
    </p>
    <p style="margin:0 0 20px;">
      Herzliche Grüße,<br>
      Dein EPHIA-Team
    </p>

    ${FOOTER}
  </div>
</div>`;
}

export function buildInvoiceEmail(firstName: string): string {
  return `<div style="background-color:#fff; padding:0; font-family:Arial, sans-serif;">
  <div style="background-color:#fff; max-width:600px; margin:0 auto; padding:8px; text-align:left; line-height:1.5;">
    <p style="margin-top:0; margin-bottom:20px;">
      Hi ${firstName},<br><br>
      mit dieser E-Mail senden wir Dir hier Deine Rechnung zu Deinem Kauf. Falls Du Fragen oder Änderungswünsche hast, dann antworte uns einfach auf diese E-Mail.
    </p>

    <p style="margin:0 0 20px;">
      Herzliche Grüße,<br>
      Dein EPHIA-Team
    </p>

    ${FOOTER}
  </div>
</div>`;
}
