import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildEmailHtml } from "@/lib/email-template";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const BATCH_SIZE = 100;

export async function POST(req: NextRequest) {
  const { courseId, subject, bodyText, excludedPatientIds, excludeBlacklisted, scheduledAt } = await req.json();

  if (!courseId || !subject || !bodyText) {
    return NextResponse.json({ error: "Pflichtfelder fehlen." }, { status: 400 });
  }

  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY nicht konfiguriert." }, { status: 500 });
  }

  const supabase = createAdminClient();

  // Fetch course
  const { data: course } = await supabase
    .from("courses")
    .select("id, title, course_date, location")
    .eq("id", courseId)
    .single();

  if (!course) {
    return NextResponse.json({ error: "Kurs nicht gefunden." }, { status: 404 });
  }

  // Fetch all patients
  const { data: allPatients } = await supabase
    .from("patients")
    .select("id, email, first_name, last_name, patient_status");

  if (!allPatients || allPatients.length === 0) {
    return NextResponse.json({ error: "Keine Proband:innen vorhanden." }, { status: 400 });
  }

  // Filter recipients
  const excludedSet = new Set(excludedPatientIds || []);
  const emailsSeen = new Set<string>();
  const recipients = allPatients.filter((p) => {
    if (!p.email) return false;
    if (excludeBlacklisted && p.patient_status === "blacklist") return false;
    if (excludedSet.has(p.id)) return false;
    const emailLower = p.email.toLowerCase();
    if (emailsSeen.has(emailLower)) return false;
    emailsSeen.add(emailLower);
    return true;
  });

  if (recipients.length === 0) {
    return NextResponse.json({ error: "Keine Empfänger:innen nach Filterung." }, { status: 400 });
  }

  // Format course details
  let formattedDate = "";
  if (course.course_date) {
    try {
      formattedDate = format(new Date(course.course_date + "T00:00:00"), "EEEE, dd. MMMM yyyy", { locale: de });
    } catch {
      formattedDate = course.course_date;
    }
  }

  // Determine status and send_at
  const status = scheduledAt ? "scheduled" : "sending";
  const sendAtParam = scheduledAt ? new Date(scheduledAt).toISOString() : undefined;

  // Save campaign to DB
  const { data: campaign, error: insertErr } = await supabase
    .from("email_campaigns")
    .insert({
      course_id: courseId,
      subject,
      body_text: bodyText,
      recipient_count: recipients.length,
      excluded_patient_ids: Array.from(excludedSet),
      status,
      scheduled_at: scheduledAt || null,
    })
    .select("id")
    .single();

  if (insertErr || !campaign) {
    return NextResponse.json({ error: insertErr?.message || "Kampagne konnte nicht gespeichert werden." }, { status: 500 });
  }

  // Build and send emails in batches
  try {
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);

      const emails = batch.map((p) => ({
        from: "EPHIA <customerlove@ephia.de>",
        to: [p.email],
        subject,
        html: buildEmailHtml({
          firstName: p.first_name || "Proband:in",
          intro: bodyText,
          infoRows: [
            { label: "Kurs", value: course.title },
            { label: "Datum", value: formattedDate },
            { label: "Ort", value: course.location || "" },
          ],
        }),
        ...(sendAtParam ? { send_at: sendAtParam } : {}),
      }));

      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emails),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Resend batch error: ${errBody}`);
      }

      // Brief pause between batches
      if (i + BATCH_SIZE < recipients.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    // Update campaign as sent
    await supabase
      .from("email_campaigns")
      .update({
        status: scheduledAt ? "scheduled" : "sent",
        sent_at: scheduledAt ? null : new Date().toISOString(),
      })
      .eq("id", campaign.id);

    return NextResponse.json({ ok: true, campaignId: campaign.id, recipientCount: recipients.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    await supabase
      .from("email_campaigns")
      .update({ status: "failed", error_message: message })
      .eq("id", campaign.id);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
