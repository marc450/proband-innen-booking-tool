import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";

// Lead capture for the "Termin-Updates erhalten" modal on the course
// landing pages. Replaces the old /api/hubspot-signup route (HubSpot is
// no longer used). Stores the lead in our own termin_update_leads table
// and best-effort-pings Slack so staff see it immediately.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLACK_WEBHOOK_URL_COURSES = process.env.SLACK_WEBHOOK_URL_COURSES;

// Strip Slack mrkdwn control chars so a submitter can't spoof formatting
// or inject @-mentions into the channel message.
function slackSafe(s: string): string {
  return s.replace(/[*_<>@]/g, "").slice(0, 200);
}

export async function POST(req: NextRequest) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const rl = checkRateLimit(`termin-interest:${ip}`, [
    { windowMs: 60_000, max: 5 },
    { windowMs: 3_600_000, max: 30 },
  ]);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte versuche es später erneut." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let body: {
    title?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    sourceUrl?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim().slice(0, 50) : null;
  const firstName = (body.firstName ?? "").trim().slice(0, 100);
  const lastName = (body.lastName ?? "").trim().slice(0, 100);
  const email = (body.email ?? "").trim().toLowerCase().slice(0, 200);
  const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.slice(0, 300) : null;

  if (!firstName || !lastName || !email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Bitte fülle alle Pflichtfelder korrekt aus." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.from("termin_update_leads").insert({
    title: title || null,
    first_name: firstName,
    last_name: lastName,
    email,
    source_url: sourceUrl,
  });
  if (error) {
    console.error("termin-interest insert failed:", error);
    return NextResponse.json({ error: "Fehler beim Speichern." }, { status: 500 });
  }

  // Best-effort Slack ping so staff see the lead immediately.
  if (SLACK_WEBHOOK_URL_COURSES) {
    try {
      await fetch(SLACK_WEBHOOK_URL_COURSES, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: [
            `*Typ:* Termin-Update-Anmeldung`,
            `*Name:* ${slackSafe([title, firstName, lastName].filter(Boolean).join(" "))}`,
            `*E-Mail:* ${slackSafe(email)}`,
            sourceUrl ? `*Seite:* ${slackSafe(sourceUrl)}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        }),
      });
    } catch (slackErr) {
      console.error("termin-interest Slack notify failed (non-fatal):", slackErr);
    }
  }

  return NextResponse.json({ ok: true });
}
