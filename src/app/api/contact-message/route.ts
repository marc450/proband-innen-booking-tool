import { NextRequest, NextResponse } from "next/server";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

interface ContactPayload {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  sourceUrl?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nl2br(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

/**
 * POST /api/contact-message — generic contact form on /kurse/faq-kontakt.
 * Mirrors the /api/group-inquiry pattern: Resend email to
 * customerlove@ephia.de + optional Slack ping.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<ContactPayload>;
    const firstName = (body.firstName ?? "").trim();
    const lastName = (body.lastName ?? "").trim();
    const email = (body.email ?? "").trim();
    const message = (body.message ?? "").trim();
    const sourceUrl = (body.sourceUrl ?? "").trim();

    if (!firstName || !lastName || !email || !message) {
      return NextResponse.json(
        { error: "Bitte fülle alle Felder aus." },
        { status: 400 },
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Bitte gib eine gültige E-Mail-Adresse ein." },
        { status: 400 },
      );
    }

    if (!RESEND_API_KEY) {
      return NextResponse.json(
        { error: "E-Mail-Versand ist aktuell nicht konfiguriert." },
        { status: 500 },
      );
    }

    const rows: Array<[string, string]> = [
      ["Name", `${firstName} ${lastName}`],
      ["E-Mail", email],
      ["Nachricht", message],
    ];
    if (sourceUrl) rows.push(["Quelle", sourceUrl]);

    const tableRows = rows
      .map(
        ([label, value]) =>
          `<tr>
             <td style="padding:10px 14px; background:#FAEBE1; font-weight:600; color:#000; vertical-align:top; width:160px;">${escapeHtml(
               label,
             )}</td>
             <td style="padding:10px 14px; color:#222; vertical-align:top;">${nl2br(
               value,
             )}</td>
           </tr>`,
      )
      .join("");

    const html = `<!doctype html>
<html lang="de">
  <body style="margin:0; padding:0; background:#f6f6f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="max-width:640px; margin:0 auto; padding:24px;">
      <div style="background:#ffffff; border-radius:10px; padding:28px;">
        <h1 style="margin:0 0 8px; font-size:22px; color:#000;">Neue Kontaktanfrage</h1>
        <p style="margin:0 0 20px; color:#555; font-size:14px;">Über das Formular auf /kurse/faq-kontakt eingegangen.</p>
        <table style="width:100%; border-collapse:separate; border-spacing:0 6px; font-size:14px;">
          ${tableRows}
        </table>
      </div>
      <p style="text-align:center; color:#999; font-size:12px; margin-top:16px;">Antworte direkt auf diese E-Mail, um mit der anfragenden Person Kontakt aufzunehmen.</p>
    </div>
  </body>
</html>`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "EPHIA Website <customerlove@ephia.de>",
        to: ["customerlove@ephia.de"],
        reply_to: email,
        subject: `Kontaktanfrage von ${firstName} ${lastName}`,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("Resend contact-message failed:", errText);
      return NextResponse.json(
        { error: "E-Mail konnte nicht gesendet werden." },
        { status: 500 },
      );
    }

    if (SLACK_WEBHOOK_URL) {
      try {
        await fetch(SLACK_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: [
              `*Neue Kontaktanfrage*`,
              `*Name:* ${firstName} ${lastName}`,
              `*E-Mail:* ${email}`,
              `*Nachricht:* ${message}`,
            ].join("\n"),
          }),
        });
      } catch (slackErr) {
        console.error("Slack contact notification failed:", slackErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("contact-message error:", err);
    return NextResponse.json(
      { error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
