const LOGO_URL =
  "https://lwfiles.mycourse.app/6638baeec5c56514e03ec360-public/f64a1ea1eb5346a171fe9ea36e8615ca.png";

/**
 * Shared preparation / onboarding copy sent to Proband:innen in every
 * appointment email (initial confirmation, slot change, etc.). Kept in
 * one place so copy drift between the paid funnel, the private funnel
 * and the slot-change notification can't happen again.
 */
export const PATIENT_PREPARATION_BLOCK = `
  <p style="margin:0 0 12px;">
    <strong>Bitte stelle sicher, dass Du 10 Minuten vor Start Deiner Behandlung in der Praxis eintriffst.</strong>
  </p>

  <p style="margin:20px 0 4px; font-weight:bold;">Umfang Deiner Behandlung</p>
  <p style="margin:0 0 0;">
    Bei der Registrierung durftest Du Deine Behandlungswünsche angeben. Leider kann aus Zeit- und Kostengründen nicht garantiert werden, dass der/die behandelnde Ärzt:in alle Deine Wünsche erfüllen kann, er/sie wird sich aber größte Mühe geben, Dir so weit wie möglich entgegenzukommen.
  </p>

  <p style="margin:20px 0 4px; font-weight:bold;">Hautpflege & Make-up</p>
  <p style="margin:0 0 8px;">
    Bitte bereite Dich gut auf Deinen Termin vor, damit Deine Behandlung reibungslos und effektiv verläuft. Gib der Ärztin/dem Arzt vor Deiner Behandlung Bescheid, falls das Deine erste ästhetische Behandlung sein wird.
  </p>

  <p style="margin:12px 0 4px; font-weight:bold;">Hautpflege</p>
  <p style="margin:0 0 0;">
    Vermeide 2-3 Tage vor der Behandlung Hautpflegeprodukte, die Deine Haut reizen könnten. Setze stattdessen auf leichte und gut verträgliche Pflege. Achte außerdem darauf, ausreichend Wasser zu trinken, um Deine Haut optimal zu hydratisieren.
  </p>

  <p style="margin:12px 0 4px; font-weight:bold;">Make-up</p>
  <p style="margin:0 0 0;">
    Am Tag der Behandlung solltest Du möglichst kein Make-up tragen, um die Hygiene während der Behandlung zu gewährleisten. Falls Du Dich ohne Make-up unwohl fühlst, kannst Du leichtes Make-up verwenden und Dich vor Ort im Studio abschminken. Wir bitten Dich, die dafür notwendigen Utensilien selbst mitzubringen.
  </p>

  <p style="margin:20px 0 4px; font-weight:bold;">Zusätzliche Informationen</p>
  <p style="margin:0 0 0;">
    Stelle Dich bitte auf längere Wartezeiten ein und beachte, dass wir in der Praxis keine Kapazitäten für Freunde, Angehörige oder Haustiere haben. Komme daher bitte ohne Begleitung. Am besten bringst Du ein Buch mit oder etwas, womit Du Dich beschäftigen kannst, solltest Du nicht direkt drankommen. Während des Kurses werden wir Vorher-Nachher-Bilder von den Behandlungen erstellen. Dies dient unserer internen Dokumentation.
  </p>

  <p style="margin:20px 0 4px; font-weight:bold;">Bei Fragen</p>
  <p style="margin:0 0 20px;">
    Solltest Du nach Deiner Behandlung noch weitere Fragen haben, möchten wir Dich bitten, Dich zunächst an die Ärztin oder den Arzt zu wenden, die/der Dich behandelt hat. Sollte es dennoch weiterhin Unklarheiten geben, bieten wir allen Ärzt:innen, die wir ausgebildet haben, eine direkte Anlaufstelle für solche Situationen.
  </p>
`;

const FOOTER = `
  <div style="margin-top:24px; padding-top:16px; border-top:1px solid #f0f0f0; text-align:left;">
    <img src="${LOGO_URL}" alt="EPHIA" style="width:160px; height:auto; display:block; margin:0 0 8px;">
    <div style="color:#9e9e9e; font-size:12px; line-height:1.5;">
      EPHIA Medical GmbH<br>
      Dorfstraße 30, 15913 Märkische Heide, Deutschland<br>
      Geschäftsführerin: Dr. Sophia Wilk-Vollmann
    </div>
  </div>`;

interface InfoBoxRow {
  label: string;
  value: string;
}

export interface EmailButton {
  label: string;
  url: string;
}

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "button"; label: string; url: string }
  | { type: "image"; src: string; alt?: string };

function renderButton(b: EmailButton) {
  return `<a href="${b.url}" target="_blank" style="display:inline-block;background-color:#0066FF;color:#ffffff;font-weight:bold;font-size:16px;padding:12px 24px;border-radius:10px;text-decoration:none;margin:0 8px 8px 0;">${b.label}</a>`;
}

// Inline default styles into rich-text HTML coming out of the editor so
// the sent email matches what Marc sees while composing. Without this,
// Gmail and most desktop clients fall back to their own browser defaults
// (big <p> margins, 40px <ul> padding, no link color), which visibly
// diverges from the editor preview. We only apply a style when the tag
// doesn't already carry one so user-pasted styled content is preserved.
function inlineRichTextStyles(html: string): string {
  const inject = (tag: string, style: string) =>
    (s: string) =>
      s.replace(
        new RegExp(`<${tag}(?![^>]*\\sstyle=)(\\s|>)`, "gi"),
        `<${tag} style="${style}"$1`,
      );
  const pipeline: Array<(s: string) => string> = [
    inject("p", "margin:0 0 8px;"),
    inject("ul", "margin:0 0 8px;padding-left:20px;list-style-type:disc;"),
    inject("ol", "margin:0 0 8px;padding-left:20px;list-style-type:decimal;"),
    inject("li", "margin:0 0 4px;"),
    inject("a", "color:#0066FF;text-decoration:underline;"),
    inject(
      "blockquote",
      "margin:0 0 8px;padding-left:12px;border-left:2px solid #e5e7eb;color:#525252;",
    ),
  ];
  return pipeline.reduce((acc, fn) => fn(acc), html);
}

function renderContentBlocks(blocks: ContentBlock[]): string {
  return blocks
    .map((block) => {
      if (block.type === "text") {
        // Use a <div> wrapper — the text already contains <p>/<div>/<br> from
        // the rich text editor. Wrapping in <p> would create invalid nested
        // paragraphs with inconsistent spacing between editor and preview.
        const styled = inlineRichTextStyles(block.text);
        return `<div style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:14px;line-height:1.5;">${styled}</div>`;
      }
      if (block.type === "button" && block.label && block.url) {
        return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
        <tr><td>${renderButton(block)}</td></tr>
      </table>`;
      }
      if (block.type === "image" && block.src) {
        return `<img src="${block.src}" alt="${block.alt || ""}" style="max-width:100%;height:auto;border-radius:10px;margin:0 0 20px;display:block;" />`;
      }
      return "";
    })
    .join("\n    ");
}

export function buildEmailHtml({
  firstName,
  intro,
  infoRows = [],
  note,
  buttons = [],
  contentBlocks,
  closing = "Herzliche Grüße,<br>Dein EPHIA-Team",
  extraContent = "",
}: {
  firstName: string;
  intro?: string;
  infoRows?: InfoBoxRow[];
  note?: string;
  buttons?: EmailButton[];
  contentBlocks?: ContentBlock[];
  closing?: string;
  extraContent?: string;
}): string {
  const rows = infoRows
    .filter((r) => r.value)
    .map(
      (r) =>
        `<p style="margin:0 0 6px;"><span style="font-weight:bold;">${r.label}:</span> ${r.value}</p>`
    )
    .join("");

  const noteHtml = note
    ? `<div style="background-color:#FAEBE1; border:1px solid #F0D0B8; border-radius:8px; padding:14px 16px; margin:0 0 20px; font-size:14px; line-height:1.5;">
        <strong>Wichtiger Hinweis:</strong> ${note}
       </div>`
    : "";

  // If contentBlocks provided, use them for the body instead of intro + buttons
  let bodyHtml: string;
  if (contentBlocks && contentBlocks.length > 0) {
    bodyHtml = renderContentBlocks(contentBlocks);
  } else {
    const buttonsHtml = buttons.length > 0
      ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
        <tr><td>
          ${buttons.map(renderButton).join("\n          ")}
        </td></tr>
      </table>`
      : "";
    bodyHtml = `<p style="margin:0 0 20px;">${intro || ""}</p>\n    ${buttonsHtml}`;
  }

  return `<div style="background-color:#fff; padding:0; font-family:Arial, sans-serif; font-size:14px;">
  <div style="background-color:#fff; max-width:600px; margin:0 auto; padding:8px; text-align:left; line-height:1.5; font-size:14px;">

    <p style="margin-top:0; margin-bottom:20px; font-size:14px;">
      Hi ${firstName},
    </p>

    ${bodyHtml}

    ${rows ? `<div style="border-radius:8px; padding:14px 16px; background-color:#FAEBE1; border:1px solid #F0D0B8; font-size:14px; margin:0 0 20px; text-align:left;">
      ${rows}
    </div>` : ""}

    ${noteHtml}
    ${extraContent}

    <p style="margin:0 0 20px; font-size:14px;">
      ${closing}
    </p>

    ${FOOTER}
  </div>
</div>`;
}
