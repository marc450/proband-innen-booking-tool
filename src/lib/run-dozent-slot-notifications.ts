// Slack-DM notification: tell every Dozent:in when new open course slots
// are ready to apply for. One pass of the daily sweep (/api/send-reminders),
// same shape as the Galderma/rebooking passes.
//
// Admins post open Praxiskurs dates in Kursplanung; this pass finds the
// ones that haven't been announced yet and DMs each Dozent:in a single
// digest of the newly opened slots with a link to "Offene Termine". One
// DM per Dozent:in per run (not one per slot), so a batch of new dates is
// a tidy list rather than a burst of pings.
//
// Idempotent via course_date_proposals.dozent_notified_at (migration 161),
// stamped BEFORE the sends: a double-run can then never DM twice, and the
// worst case of a Slack outage is one missed digest rather than a loop of
// them. Best-effort throughout — Slack delivery must never fail the sweep.

import type { createAdminClient } from "@/lib/supabase/admin";
import { sendSlackDm } from "@/lib/slack-dm";
import { parseDateOnly } from "@/lib/date";

const ADMIN_BASE = "https://admin.ephia.de";
const APPLY_URL = `${ADMIN_BASE}/dashboard/kursplanung/uebernehmen`;

const MONTHS_DE = [
  "Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dez",
];

function formatDate(iso: string): string {
  const d = parseDateOnly(iso);
  return `${String(d.getDate()).padStart(2, "0")}. ${MONTHS_DE[d.getMonth()]} ${d.getFullYear()}`;
}

export interface DozentSlotNotificationResult {
  /** Dozent:innen DMed (attempted). */
  notified: number;
  /** Newly announced slots. */
  slots: number;
  errors: number;
}

export async function runDozentSlotNotifications(
  admin: ReturnType<typeof createAdminClient>,
): Promise<DozentSlotNotificationResult> {
  // No bot token → the DM helper would skip every send anyway. Bail before
  // stamping so the slots stay un-notified until Slack is configured.
  if (!process.env.SLACK_BOT_TOKEN) {
    return { notified: 0, slots: 0, errors: 0 };
  }

  // 1) Open slots that haven't been announced yet.
  const { data: proposals, error: propErr } = await admin
    .from("course_date_proposals")
    .select("id, template_id, proposed_date, start_time")
    .eq("status", "open")
    .is("dozent_notified_at", null)
    .order("proposed_date", { ascending: true });

  if (propErr) {
    console.error("dozent-slot-notify: proposal query failed:", propErr);
    return { notified: 0, slots: 0, errors: 1 };
  }
  const openProposals = proposals ?? [];
  if (openProposals.length === 0) {
    return { notified: 0, slots: 0, errors: 0 };
  }

  // 2) Recipients: every Dozent:in. Skip stamping when there are none, so a
  //    later run (once someone is flagged is_dozent) can still announce.
  const { data: dozenten, error: dozErr } = await admin
    .from("profiles")
    .select("id, first_name, slack_user_id")
    .eq("is_dozent", true);
  if (dozErr) {
    console.error("dozent-slot-notify: dozent query failed:", dozErr);
    return { notified: 0, slots: 0, errors: 1 };
  }
  const recipients = dozenten ?? [];
  if (recipients.length === 0) {
    console.warn("dozent-slot-notify: new slots exist but no Dozent:innen on file; not stamping.");
    return { notified: 0, slots: 0, errors: 0 };
  }

  // Template names for the digest lines.
  const templateIds = Array.from(
    new Set(openProposals.map((p) => p.template_id as string)),
  );
  const { data: templates } = await admin
    .from("course_templates")
    .select("id, title, course_label_de")
    .in("id", templateIds);
  const nameById = new Map(
    (templates ?? []).map((t) => [
      t.id as string,
      (t.course_label_de as string | null) || (t.title as string) || "Kurs",
    ]),
  );

  // 3) Stamp FIRST so a crash or duplicate sweep can't double-notify.
  const ids = openProposals.map((p) => p.id as string);
  const { error: stampErr } = await admin
    .from("course_date_proposals")
    .update({ dozent_notified_at: new Date().toISOString() })
    .in("id", ids)
    .is("dozent_notified_at", null);
  if (stampErr) {
    console.error("dozent-slot-notify: stamp failed, skipping sends:", stampErr);
    return { notified: 0, slots: 0, errors: 1 };
  }

  // 4) Compose the shared digest body (one list of the new slots).
  const slotLines = openProposals.map((p) => {
    const name = nameById.get(p.template_id as string) ?? "Kurs";
    const time = (p.start_time as string | null) || null;
    const when = time
      ? `${formatDate(p.proposed_date as string)} · ${time}`
      : formatDate(p.proposed_date as string);
    return `• *${when}* · ${name}`;
  });

  const intro =
    openProposals.length === 1
      ? "Ein neuer Kurstermin ist ausgeschrieben. Du kannst Dich ab sofort darauf bewerben:"
      : "Neue Kurstermine sind ausgeschrieben. Du kannst Dich ab sofort darauf bewerben:";

  // 5) DM each Dozent:in. sendSlackDm is best-effort and silent-fails, so a
  //    single bad recipient never stops the rest. For anyone without a
  //    stored slack_user_id, pull their email from auth.users so the helper
  //    can fall back to users.lookupByEmail (same approach as slack-tasks).
  let notified = 0;
  let errors = 0;
  for (const d of recipients) {
    const slackUserId = (d.slack_user_id as string | null) ?? null;
    let email: string | null = null;
    if (!slackUserId) {
      try {
        const { data } = await admin.auth.admin.getUserById(d.id as string);
        email = data.user?.email ?? null;
      } catch {
        // Best-effort: a missing email just means we skip this DM.
      }
    }

    const greeting = d.first_name ? `Hallo ${d.first_name},` : "Hallo,";
    const text = [
      greeting,
      intro,
      "",
      ...slotLines,
      "",
      "Übernimm die Termine, die Du unterrichten möchtest:",
      APPLY_URL,
    ].join("\n");

    try {
      await sendSlackDm({
        slackUserId,
        email,
        text,
        logTag: "dozent-slot-notify",
      });
      notified += 1;
    } catch (err) {
      console.error(`dozent-slot-notify: DM to ${d.id} threw:`, err);
      errors += 1;
    }
  }

  console.log(
    `dozent-slot-notify: announced ${openProposals.length} slot(s) to ${notified} Dozent:in(nen)`,
  );
  return { notified, slots: openProposals.length, errors };
}
