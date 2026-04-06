const LOGO_URL =
  "https://lwfiles.mycourse.app/6638baeec5c56514e03ec360-public/f64a1ea1eb5346a171fe9ea36e8615ca.png";

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
  | { type: "button"; label: string; url: string };

function renderButton(b: EmailButton) {
  return `<a href="${b.url}" target="_blank" style="display:inline-block;background-color:#0066FF;color:#ffffff;font-weight:bold;font-size:16px;padding:12px 24px;border-radius:10px;text-decoration:none;margin:0 8px 8px 0;">${b.label}</a>`;
}

function renderContentBlocks(blocks: ContentBlock[]): string {
  return blocks
    .map((block) => {
      if (block.type === "text") {
        return `<p style="margin:0 0 20px;">${block.text}</p>`;
      }
      if (block.type === "button" && block.label && block.url) {
        return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
        <tr><td>${renderButton(block)}</td></tr>
      </table>`;
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

  return `<div style="background-color:#fff; padding:0; font-family:Arial, sans-serif;">
  <div style="background-color:#fff; max-width:600px; margin:0 auto; padding:8px; text-align:left; line-height:1.5;">

    <p style="margin-top:0; margin-bottom:20px;">
      Hi ${firstName},
    </p>

    ${bodyHtml}

    ${rows ? `<div style="border-radius:8px; padding:14px 16px; background-color:#FAEBE1; border:1px solid #F0D0B8; font-size:14px; margin:0 0 20px; text-align:left;">
      ${rows}
    </div>` : ""}

    ${noteHtml}
    ${extraContent}

    <p style="margin:0 0 20px;">
      ${closing}
    </p>

    ${FOOTER}
  </div>
</div>`;
}
