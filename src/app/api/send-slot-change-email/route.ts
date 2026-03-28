import { NextRequest, NextResponse } from "next/server";
import { buildEmailHtml } from "@/lib/email-template";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;

export async function POST(req: NextRequest) {
  const { email, firstName, courseTitle, date, time, location, bookingType } = await req.json();

  if (!email || !RESEND_API_KEY) {
    return NextResponse.json({ error: "Missing email or API key" }, { status: 400 });
  }

  const html = buildEmailHtml({
    firstName: firstName || "Proband:in",
    intro: `Dein Termin für <strong>${courseTitle}</strong> wurde geändert. Hier sind Deine neuen Termindetails:`,
    infoRows: [
      { label: "Behandlung", value: courseTitle },
      { label: "Datum", value: date },
      { label: "Uhrzeit", value: time ? `${time} Uhr` : "" },
      { label: "Ort", value: location || "" },
    ],
    note: bookingType === "private" ? undefined : "Bei Nichterscheinen oder Absage weniger als 48 Stunden vor dem Termin wird eine Ausfallgebühr von 50,00 EUR erhoben.",
    extraContent: `<p style="margin:0 0 20px;">
      Solltest Du Fragen haben oder einen anderen Termin benötigen, melde Dich jederzeit bei uns:
      <a href="mailto:customerlove@ephia.de" style="color:#0066FF; text-decoration:none;">customerlove@ephia.de</a>
    </p>`,
  });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "EPHIA <customerlove@ephia.de>",
      to: [email],
      subject: `Terminänderung: ${courseTitle}`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
