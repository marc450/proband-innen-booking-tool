import { NextRequest, NextResponse } from "next/server";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

interface GroupInquiryPayload {
  name: string;
  email: string;
  phone?: string;
  attendees: string;
  topic: string;
  timeframe: string;
  message?: string;
  courseTitle?: string;
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

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<GroupInquiryPayload>;

    const name = (body.name ?? "").trim();
    const email = (body.email ?? "").trim();
    const phone = (body.phone ?? "").trim();
    const attendees = (body.attendees ?? "").trim();
    const topic = (body.topic ?? "").trim();
    const timeframe = (body.timeframe ?? "").trim();
    const message = (body.message ?? "").trim();
    const courseTitle = (body.courseTitle ?? "").trim();
    const sourceUrl = (body.sourceUrl ?? "").trim();

    if (!name || !email || !attendees || !topic || !timeframe) {
      return NextResponse.json(
        { error: "Bitte fülle alle Pflichtfelder aus." },
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
        { error: "Email-Versand ist aktuell nicht konfiguriert." },
        { status: 500 },
      );
    }

    const subject = courseTitle
      ? `Gruppenbuchungsanfrage: ${courseTitle}`
      : "Gruppenbuchungsanfrage";

    const rows: Array<[string, string]> = [
      ["Name", name],
      ["E-Mail", email],
    ];
    if (phone) rows.push(["Telefon", phone]);
    if (courseTitle) rows.push(["Kurs", courseTitle]);
    rows.push(["Teilnehmer:innen", attendees]);
    rows.push(["Gewünschter Kursinhalt", topic]);
    rows.push(["Gewünschter Zeitraum", timeframe]);
    if (message) rows.push(["Nachricht", message]);
    if (sourceUrl) rows.push(["Quelle", sourceUrl]);

    const tableRows = rows
      .map(
        ([label, value]) =>
          `<tr>
             <td style="padding:10px 14px; background:#FAEBE1; font-weight:600; color:#000; vertical-align:top; width:180px;">${escapeHtml(
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
        <h1 style="margin:0 0 8px; font-size:22px; color:#000;">Neue Gruppenbuchungsanfrage</h1>
        <p style="margin:0 0 20px; color:#555; font-size:14px;">Über das Formular auf der Kurs-Landingpage eingegangen.</p>
        <table style="width:100%; border-collapse:separate; border-spacing:0 6px; font-size:14px;">
          ${tableRows}
        </table>
      </div>
      <p style="text-align:center; color:#999; font-size:12px; margin-top:16px;">
        Antworte direkt auf diese E-Mail, um mit der anfragenden Person Kontakt aufzunehmen.
      </p>
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
        subject,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("Resend group inquiry failed:", errText);
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
              `*Neue Gruppenbuchungsanfrage*${courseTitle ? ` – ${courseTitle}` : ""}`,
              `*Name:* ${name}`,
              `*E-Mail:* ${email}`,
              phone ? `*Telefon:* ${phone}` : null,
              `*Teilnehmer:innen:* ${attendees}`,
              `*Kursinhalt:* ${topic}`,
              `*Zeitraum:* ${timeframe}`,
              message ? `*Nachricht:* ${message}` : null,
            ]
              .filter(Boolean)
              .join("\n"),
          }),
        });
      } catch (slackErr) {
        console.error("Slack group inquiry notification failed:", slackErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Group inquiry error:", err);
    return NextResponse.json(
      { error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
