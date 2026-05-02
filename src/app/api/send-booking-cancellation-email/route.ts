import { NextRequest, NextResponse } from "next/server";
import { buildEmailHtml } from "@/lib/email-template";
import { archiveSentMessage } from "@/lib/gmail";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;

/**
 * Sends a cancellation confirmation to a Proband:in when staff delete
 * their booking from the admin dashboard. Called by the bookings
 * manager right after the DELETE succeeds, so we never email someone
 * whose row actually failed to delete.
 */
export async function POST(req: NextRequest) {
  const { email, firstName, courseTitle, date, time, location } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }
  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const html = buildEmailHtml({
    firstName: firstName || "Proband:in",
    intro: `Dein Termin für <strong>${courseTitle || "Deine Behandlung"}</strong> wurde storniert. Hier sind die Details des stornierten Termins:`,
    infoRows: [
      { label: "Behandlung", value: courseTitle || "" },
      { label: "Datum", value: date || "" },
      { label: "Uhrzeit", value: time ? `${time} Uhr` : "" },
      { label: "Ort", value: location || "" },
    ],
    extraContent: `<p style="margin:0 0 20px;">
      Falls Du einen neuen Termin buchen möchtest oder Fragen zur Stornierung hast, melde Dich jederzeit bei uns:
      <a href="mailto:customerlove@ephia.de" style="color:#0066FF; text-decoration:none;">customerlove@ephia.de</a>
    </p>`,
  });

  const subject = `Stornierung Deines Termins: ${courseTitle || "EPHIA"}`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "EPHIA <customerlove@ephia.de>",
      to: [email],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Failed to send cancellation email:", err);
    return NextResponse.json({ error: err }, { status: 500 });
  }

  // Mirror into Gmail Sent so the patient profile picks it up. Best-effort.
  try {
    await archiveSentMessage({ to: email, subject, html });
  } catch (archiveErr) {
    console.error("archiveSentMessage failed (non-fatal):", archiveErr);
  }

  return NextResponse.json({ ok: true });
}
