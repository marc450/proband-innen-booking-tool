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

export function buildEmailHtml({
  firstName,
  intro,
  infoRows,
  note,
  closing = "Herzliche Grüße,<br>Dein EPHIA-Team",
  extraContent = "",
}: {
  firstName: string;
  intro: string;
  infoRows: InfoBoxRow[];
  note?: string;
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

  return `<div style="background-color:#fff; padding:0; font-family:Arial, sans-serif;">
  <div style="background-color:#fff; max-width:600px; margin:0 auto; padding:8px; text-align:left; line-height:1.5;">

    <p style="margin-top:0; margin-bottom:20px;">
      Hi ${firstName},<br><br>
      ${intro}
    </p>

    <div style="border-radius:8px; padding:14px 16px; background-color:#FAEBE1; border:1px solid #F0D0B8; font-size:14px; margin:0 0 20px; text-align:left;">
      ${rows}
    </div>

    ${noteHtml}
    ${extraContent}

    <p style="margin:0 0 20px;">
      ${closing}
    </p>

    ${FOOTER}
  </div>
</div>`;
}
