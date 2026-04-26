import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildEmailHtml } from "@/lib/email-template";
import { sendEmailViaResend } from "@/lib/post-purchase";

/**
 * POST /api/send-legacy-apology
 *
 * One-shot admin endpoint that emails a correction to the 64 legacy-import
 * doctors who were mistakenly hit by the "Bitte vervollständige Dein Profil"
 * cron on 2026-04-26. Idempotent via course_bookings.legacy_apology_sent_at:
 * already-emailed rows are skipped, so a network drop mid-batch is safe to
 * retry. Once the batch has been confirmed delivered, this route should be
 * deleted in a follow-up commit.
 *
 * Selection rule mirrors the bug surface:
 *   profile_reminder_sent = true   (got the wrong email)
 *   legacy_import         = true   (it was wrong because they're legacy)
 *   legacy_apology_sent_at IS NULL (haven't received the apology yet)
 */
export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = createAdminClient();
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://proband-innen.ephia.de";

  const { data: bookings, error } = await supabase
    .from("course_bookings")
    .select("id, email, first_name")
    .eq("profile_reminder_sent", true)
    .eq("legacy_import", true)
    .is("legacy_apology_sent_at", null);

  if (error) {
    console.error("legacy-apology: select failed", error);
    return NextResponse.json(
      { error: "Liste konnte nicht geladen werden." },
      { status: 500 },
    );
  }

  const result = { sent: 0, errors: 0 };

  for (const b of bookings ?? []) {
    if (!b.email) continue;
    try {
      const profileUrl = `${baseUrl}/courses/success?booking_id=${b.id}&email=${encodeURIComponent(b.email)}`;
      const firstName = b.first_name || "Du";
      const html = buildEmailHtml({
        firstName,
        intro: [
          "heute hast Du von uns eine E-Mail bekommen, in der wir Dich gebeten haben, Dein Profil zu vervollständigen, damit Dein Kurs freigeschaltet werden kann. Das war missverständlich. Du hast längst Zugang zu Deinem Kurs und allen Materialien, daran ändert sich nichts.",
          "<br><br>",
          "Wir aktualisieren gerade unser Buchungssystem. Damit Du dort wie gewohnt alle Deine Buchungen, Zertifikate und News findest, würden wir uns sehr freuen, wenn Du ein paar Angaben zu Dir machst. Das dauert keine zwei Minuten.",
          "<br><br>",
          "Bei Fragen meld Dich jederzeit unter customerlove@ephia.de.",
        ].join(""),
        buttons: [{ label: "Profil vervollständigen", url: profileUrl }],
      });

      await sendEmailViaResend(
        b.email,
        "Entschuldigung für unsere letzte E-Mail",
        html,
      );

      const { error: updErr } = await supabase
        .from("course_bookings")
        .update({ legacy_apology_sent_at: new Date().toISOString() })
        .eq("id", b.id);

      if (updErr) {
        console.error(
          `legacy-apology: stamp update failed for booking ${b.id}`,
          updErr,
        );
        result.errors += 1;
        continue;
      }

      result.sent += 1;
    } catch (err) {
      console.error(`legacy-apology: send failed for booking ${b.id}`, err);
      result.errors += 1;
    }
  }

  return NextResponse.json({ ok: true, ...result });
}
