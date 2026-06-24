// Galderma contact-intro pass, shared by the daily sweep (/api/send-reminders,
// the same cron that ships the export and post-praxis certificates). 24h after
// an Ärzt:in signs the Galderma consent, it emails them their personal Galderma
// contact (the überregionale Ansprechpartnerin), then stamps
// contact_intro_sent_at so each doctor is introduced exactly once.
//
// Selection is `consented_at <= now() - 24h`, not exactly "yesterday": a missed
// daily run can never silently drop a doctor, the next run picks them up.
// contact_intro_sent_at keeps it idempotent regardless of how often this runs.
// Revoked consents are excluded, so a doctor who withdraws within the first 24h
// is never introduced.
//
// Gated by GALDERMA_EXPORT_LIVE alongside the export: the whole Galderma
// program stays dark until the legal sign-offs are done.

import type { createAdminClient } from "@/lib/supabase/admin";
import { sendGaldermaContactIntroEmail } from "@/lib/partner-galderma-emails";
import { GALDERMA_PARTNER, GALDERMA_EXPORT_LIVE } from "@/lib/partner-galderma";

type ConsentRow = {
  id: string;
  signed_payload: {
    first_name?: string;
    email?: string;
    course_title?: string;
  } | null;
};

export interface GaldermaContactIntroResult {
  skipped?: string;
  sent: number;
  errors: number;
}

export async function runGaldermaContactIntros(
  admin: ReturnType<typeof createAdminClient>,
): Promise<GaldermaContactIntroResult> {
  if (!GALDERMA_EXPORT_LIVE) {
    return { skipped: "export-gated-off", sent: 0, errors: 0 };
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from("partner_data_consents")
    .select("id, signed_payload")
    .eq("partner", GALDERMA_PARTNER)
    .not("consented_at", "is", null)
    .lte("consented_at", cutoff)
    .is("revoked_at", null)
    .is("contact_intro_sent_at", null);

  if (error) {
    console.error("galderma-contact-intro: consent query failed:", error);
    return { sent: 0, errors: 1 };
  }
  const consents = (data ?? []) as ConsentRow[];
  if (consents.length === 0) {
    return { sent: 0, errors: 0 };
  }

  let sent = 0;
  let errors = 0;

  for (const c of consents) {
    const p = c.signed_payload ?? {};
    const email = (p.email ?? "").trim();
    if (!email) {
      // Consent always captures an email at signing, so this is unexpected.
      // Leave the row unstamped and log; nothing to send to.
      console.error(`galderma-contact-intro: consent ${c.id} has no email, skipping.`);
      errors += 1;
      continue;
    }

    const result = await sendGaldermaContactIntroEmail({
      to: email,
      firstName: p.first_name ?? "",
      courseTitle: p.course_title ?? null,
    });

    if (!result.ok) {
      // Leave contact_intro_sent_at null so the next daily run retries.
      console.error(
        `galderma-contact-intro: send failed for consent ${c.id}: ${result.error}`,
      );
      errors += 1;
      continue;
    }

    await admin
      .from("partner_data_consents")
      .update({ contact_intro_sent_at: new Date().toISOString() })
      .eq("id", c.id);

    sent += 1;
  }

  console.log(`galderma-contact-intro: ${sent} doctor(s) introduced.`);
  return { sent, errors };
}
