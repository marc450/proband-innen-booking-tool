import { NextRequest, NextResponse } from "next/server";
import { buildSessionChangeEmail, formatDateDe } from "@/lib/course-email-templates";
import { archiveSentMessage } from "@/lib/gmail";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;

export async function POST(req: NextRequest) {
  const { email, firstName, courseName, dateIso, startTime, durationMinutes, address, instructor } = await req.json();

  if (!email || !RESEND_API_KEY) {
    return NextResponse.json({ error: "Missing email or API key" }, { status: 400 });
  }

  const dateFormatted = formatDateDe(dateIso);

  // Calculate end time
  const [h, m] = (startTime || "10:00").split(":").map(Number);
  const totalMin = h * 60 + m + (durationMinutes || 360);
  const endTime = `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;

  const html = buildSessionChangeEmail(firstName || "Teilnehmer:in", courseName, {
    address: address || "",
    dateFormatted,
    startTime: startTime || "",
    endTime,
    instructor: instructor || "",
  });

  const subject = `Terminänderung: ${courseName}`;
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
    return NextResponse.json({ error: err }, { status: 500 });
  }

  // Mirror into Gmail Sent so the auszubildende profile picks it up. Best-effort.
  try {
    await archiveSentMessage({ to: email, subject, html });
  } catch (archiveErr) {
    console.error("archiveSentMessage failed (non-fatal):", archiveErr);
  }

  return NextResponse.json({ ok: true });
}
