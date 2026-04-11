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
          <a href="https://www.ephia.de/dozent-innen" style="color:#0066FF; text-decoration:none;">${instructor}</a>
        </p>
      </div>
    </div>`;
}

const PROBANDINNEN_SECTION = `
    <h3 style="margin:16px 0 10px;font-size:16px;font-weight:bold;">Proband:innen-Organisation</h3>
    <p style="margin:0 0 20px;">
      Für den Praxiskurs sollten alle Teilnehmer:innen eine:n eigene:n Proband:in mitbringen. Dein:e Proband:in registriert sich bitte spätestens zwei Wochen vor Kursbeginn über <a href="https://proband-innen.ephia.de/book" style="color:#0066FF;text-decoration:none;">diesen Link</a>.
      <br><br>
      Solltest Du keine:n Proband:in mitbringen können, ist das kein Ausschlusskriterium: Melde Dich einfach unter <a href="mailto:customerlove@ephia.de" style="color:#0066FF;text-decoration:none;">customerlove@ephia.de</a>, wir greifen dann auf unseren Proband:innen-Pool zurück und versuchen, eine passende Person für Dich zu organisieren. Bitte beachte, dass Anmeldungen von Proband:innen nach einer Woche vor Kursstart nicht mehr beachtet werden können.
    </p>
    <p style="margin:0 0 20px;">
      Sobald Du eine:n Proband:in angemeldet hast, erhält die Person ca. <strong>48 Stunden vor Kursbeginn</strong> alle relevanten Informationen per E-Mail, inklusive genauer Adresse, gewünschter Ankunftszeit und Details zur Behandlung.
      <br><br>
      Bei der Auswahl Deiner Proband:in freuen wir uns, wenn Du an Personen mit mehreren möglichen Indikationen denkst. So können vor Ort möglichst viele Behandlungstechniken gezeigt und geübt werden. Bitte beachte dabei unbedingt bekannte Kontraindikationen.
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
    <p style="margin:0 0 20px;">
      Wenn Du noch keinen EPHIA-Account hast, legen wir ihn mit Deiner Kursbuchung für Dich an. Du erhältst eine separate E-Mail mit der Aufforderung, ein Passwort zu vergeben. Sobald Du Dein Passwort gesetzt hast, kannst Du Dich jederzeit über <a href="https://ephia.de/start" style="color:#0066FF;text-decoration:none;">ephia.de/start</a> einloggen und direkt mit dem Lernen beginnen.
      <br><br>
      Hast Du bereits einen Account bei uns, kannst Du Dich einfach mit Deinen bestehenden Zugangsdaten anmelden – Dein neuer Kurs ist dann automatisch in Deinem Dashboard sichtbar.
    </p>

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
    <p style="margin:0 0 20px;">
      Im ersten Schritt legst Du Deinen Zugang auf EPHIA an. Dafür bitten wir Dich, ein Passwort für Deinen EPHIA-Account zu erstellen. Den entsprechenden Link hast Du bereits per E-Mail erhalten.
      <br><br>
      Falls Du schon ein Konto bei uns hast, kannst Du Dich einfach direkt <a href="https://ephia.de/start" style="color:#0066FF; text-decoration:none;">hier einloggen</a> und mit dem Lernen starten.
    </p>` : ""}

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

export function buildCommunityInviteEmail(firstName: string): string {
  return `<div style="background-color:#fff; padding:20px; font-family:Arial, sans-serif;">
  <div style="background-color:#fff; max-width:600px; margin:0 auto; padding:30px;">
    <p style="margin:0 0 20px 0; font-size:16px; line-height:1.5;">
      Hi ${firstName},<br><br>
      wir möchten Dir in Deiner Einstiegsphase in die ästhetische Medizin eine verlässliche Anlaufstelle bieten – ob bei Fragen zu Indikationen, Behandlungsansätzen oder Abrechnung. Unsere Community ist das Herz von EPHIA: Hier diskutierst Du mit Kolleg:innen, erhältst Peer-Support und vertiefst Dein Wissen durch Materialien und Dozierende.<br><br>
      Sei dabei in unserer exklusiven WhatsApp-Community für Fachleute der ästhetischen Medizin: Vernetze Dich, teile Insights und bleibe up-to-date!<br><br>
      <a href="https://chat.whatsapp.com/DfbOTDsWWksFQJhVOqdPJI" style="display:inline-block;background-color:#25D366;color:#fff;text-decoration:none;padding:12px 24px;border-radius:4px;font-weight:bold;">
        Jetzt der WhatsApp-Community beitreten
      </a>
    </p>

    <h3 style="font-size:18px;color:#333;margin:30px 0 10px 0; text-align:left;">Darauf kannst Du Dich freuen:</h3>
    <ul style="text-align:left;color:#555;font-size:15px;line-height:1.5; margin:0 0 20px 20px;">
      <li>Kontinuierlicher Austausch zu fachspezifischen Themen im Chat</li>
      <li>Regelmässige Online-Vorträge mit Gastreferent:innen</li>
      <li>Jederzeit Unterstützung und Tipps von Tutoren und Kolleg:innen</li>
      <li>Fallbesprechungen &amp; Updates zu neuen Trends und Studien</li>
    </ul>

    <p style="font-size:16px;line-height:1.5;color:#555; margin:0 0 20px 0;">
      Hast Du Fragen oder benötigst Hilfe beim Beitreten? Schreib uns gern an <a href="mailto:customerlove@ephia.de" style="color:#0066FF;text-decoration:none;">customerlove@ephia.de</a>.
    </p>

    <p style="font-size:16px;line-height:1.5;color:#555; margin:0;">
      Wir freuen uns auf Deinen Input und den gemeinsamen Austausch!<br><br>
      Herzliche Grüße,<br>
      Dein EPHIA-Team
    </p>
  </div>

  <div style="max-width:600px; margin:0 auto 20px; text-align:left;">
    <img src="${LOGO_URL}" alt="EPHIA-Logo" style="width:200px;">
  </div>
  <div style="max-width:600px; margin:0 auto; padding-bottom:20px; text-align:left; color:#9e9e9e; font-size:12px;">
    <div style="margin-bottom:8px;">
      EPHIA Medical GmbH<br>
      Dorfstraße 30, 15913 Märkische Heide, Deutschland<br>
      Geschäftsführerin: Dr. Sophia Wilk-Vollmann
    </div>
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
