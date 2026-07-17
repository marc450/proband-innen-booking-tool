// Zahlungserinnerung for Umbuchungen whose Umbuchungsgebühr is still open after
// 48h. One pass of the daily sweep (/api/send-reminders), same shape as the
// Galderma passes.
//
// A gated Umbuchung reserves a seat for the doctor (migration 154) but the fee
// is easy to forget: she gets one mail when staff start the move and nothing
// chases her, so the hold lapses and the move is lost for both sides. This
// sends exactly one reminder.
//
// Transactional, not outreach: it goes to a single doctor who asked for the
// move and owes a fee on it, like the 72h/24h course reminders.
//
// Selection:
//   * still pending and still holding seats  — a paid/withdrawn move is done
//   * fee open for >= 48h                    — created_at cutoff
//   * hold has NOT lapsed yet                — never chase a seat we owe back
//   * reminder_sent_at is null               — exactly once, ever (migration 156)
//
// Idempotent via reminder_sent_at, stamped BEFORE the send: a double-run can
// then never mail her twice, and the worst case of a Resend failure is one
// missed reminder rather than a loop of them. Her original mail still stands.

import type { createAdminClient } from "@/lib/supabase/admin";
import {
  buildRebookingReminderEmail,
  type RebookingPaymentEmailArgs,
} from "@/lib/course-email-templates";
import { archiveSentMessage } from "@/lib/gmail";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const BOOKING_SITE_URL = "https://proband-innen.ephia.de";

const REMIND_AFTER_HOURS = 48;

export interface RebookingReminderResult {
  sent: number;
  errors: number;
}

interface CourseNameRow {
  course_label_de?: string | null;
  title?: string | null;
}

/** Shape of the select below. Declared by hand because the aliased embed
 *  (to_template:course_templates!to_template_id) defeats the generated types. */
interface ReminderRow {
  id: string;
  fee_cents: number | null;
  surcharge_cents: number | null;
  to_template_id: string | null;
  expires_at: string;
  course_bookings: {
    first_name: string | null;
    email: string | null;
    course_templates: CourseNameRow | null;
  } | null;
  to_template: CourseNameRow | null;
}

function courseNameOf(t: CourseNameRow | null | undefined): string {
  return t?.course_label_de || t?.title || "EPHIA Kurs";
}

export function formatHoldDeadline(expiresAt: string): string {
  return new Date(expiresAt).toLocaleString("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function runRebookingReminders(
  admin: ReturnType<typeof createAdminClient>,
): Promise<RebookingReminderResult> {
  if (!RESEND_API_KEY) {
    return { sent: 0, errors: 0 };
  }

  const cutoff = new Date(Date.now() - REMIND_AFTER_HOURS * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("course_rebooking_requests")
    .select(
      "id, fee_cents, surcharge_cents, to_template_id, expires_at, " +
        "course_bookings(first_name, email, course_templates(course_label_de, title)), " +
        "to_template:course_templates!to_template_id(course_label_de, title)",
    )
    .eq("status", "pending")
    .eq("seats_held", true)
    .is("reminder_sent_at", null)
    .lte("created_at", cutoff)
    .gt("expires_at", now);

  if (error) {
    console.error("rebooking-reminder: query failed:", error);
    return { sent: 0, errors: 1 };
  }

  let sent = 0;
  let errors = 0;

  for (const row of (data ?? []) as unknown as ReminderRow[]) {
    const booking = row.course_bookings;
    const toTemplate = row.to_template;

    if (!booking?.email) {
      console.error(`rebooking-reminder: request ${row.id} has no recipient, skipping`);
      continue;
    }

    // Stamp first: a crash or a duplicate sweep must not produce a second mail.
    const { error: stampErr } = await admin
      .from("course_rebooking_requests")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", row.id)
      .is("reminder_sent_at", null);

    if (stampErr) {
      console.error(`rebooking-reminder: could not stamp ${row.id}, skipping send:`, stampErr);
      errors += 1;
      continue;
    }

    const currentCourseName = courseNameOf(booking.course_templates);
    const targetCourseName = row.to_template_id
      ? courseNameOf(toTemplate)
      : currentCourseName;

    const args: RebookingPaymentEmailArgs = {
      firstName: booking.first_name || "Frau Kollegin, Herr Kollege",
      currentCourseName,
      targetCourseName,
      isCrossCourse: !!row.to_template_id,
      feeCents: row.fee_cents ?? 0,
      surchargeCents: row.surcharge_cents ?? 0,
      paymentUrl: `${BOOKING_SITE_URL}/umbuchung/bezahlen/${row.id}`,
      deadline: formatHoldDeadline(row.expires_at),
    };

    const subject = `Erinnerung: Umbuchungsgebühr für ${targetCourseName}`;
    const html = buildRebookingReminderEmail(args);

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "EPHIA <customerlove@ephia.de>",
          to: [booking.email],
          subject,
          html,
        }),
      });
      if (!res.ok) throw new Error(`Resend error: ${await res.text()}`);
      sent += 1;

      try {
        await archiveSentMessage({ to: booking.email, subject, html });
      } catch (archiveErr) {
        console.error("archiveSentMessage failed (non-fatal):", archiveErr);
      }
    } catch (sendErr) {
      console.error(`rebooking-reminder: send to ${booking.email} failed:`, sendErr);
      errors += 1;
    }
  }

  if (sent > 0) console.log(`rebooking-reminder: ${sent} reminder(s) sent`);
  return { sent, errors };
}
