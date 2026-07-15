import type { SupabaseClient } from "@supabase/supabase-js";
import { buildEmailHtml } from "@/lib/email-template";
import { buildProgressMap, listUserProgress } from "@/lib/learnworlds";
import { archiveSentMessage } from "@/lib/gmail";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;

// Online-course completion mark a participant must reach to attend the
// practical day. Keep this in sync with ONLINE_COURSE_COMPLETE_PCT in
// src/app/dashboard/kurse/[sessionId]/kurs-detail.tsx (the dashboard
// badge turns green at the same value).
export const ONLINE_COURSE_MIN_PCT = 90;

// Course types with a practical day and therefore an online prerequisite.
// Onlinekurs has no praxis day, so it never gets this reminder. Mirrors
// CERTIFIABLE_COURSE_TYPES in send-post-praxis-certificate.ts.
const PRAXIS_COURSE_TYPES = ["Praxiskurs", "Kombikurs", "Premium"] as const;

// How many calendar days before the praxis day the reminder is meant to
// go out. We use a lookahead WINDOW (0..7 days) rather than an exact
// day match so a missed cron run still catches the session on the next
// run. praxis_reminder_sent_at makes the whole pass idempotent, so the
// window never causes a double-send.
const REMINDER_WINDOW_DAYS = 7;

interface SendResult {
  sent: number;
  skipped: number;
  errors: number;
}

// Embedded relations come back from Supabase as either the object or a
// length-1 array depending on type-gen vs. runtime. Normalise.
function pickOne<T>(embedded: T | T[] | null | undefined): T | null {
  if (!embedded) return null;
  return Array.isArray(embedded) ? (embedded[0] ?? null) : embedded;
}

interface EmbeddedTemplate {
  id: string | null;
  title: string | null;
  course_label_de: string | null;
  online_course_id: string | null;
  lw_slug_online: string | null;
}

interface SessionWithTemplate {
  id: string;
  template_id: string;
  date_iso: string;
  course_templates: EmbeddedTemplate | EmbeddedTemplate[] | null;
}

interface EmbeddedAuszubildende {
  first_name: string | null;
  last_name: string | null;
  lw_user_id: string | null;
}

interface BookingRow {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  course_type: string;
  status: string | null;
  praxis_reminder_sent_at: string | null;
  auszubildende_id: string | null;
  auszubildende: EmbeddedAuszubildende | EmbeddedAuszubildende[] | null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Builds the Praxiskurs online-prerequisite reminder email. Exported so
 * the transactional-emails preview renders the exact HTML the live send
 * produces. `progressLabel` is either "noch nicht begonnen" (no LW
 * account) or "{n} %".
 */
export function buildPraxisOnlineReminderEmail(opts: {
  firstName: string;
  /** "morgen" | "in einer Woche" | "in N Tagen" — how the course day is
   *  phrased in the intro. */
  timing: string;
  progressLabel: string;
  ctaUrl: string;
}): { subject: string; html: string } {
  const { firstName, timing, progressLabel, ctaUrl } = opts;
  // The shared template always renders `buttons` above the info box, but
  // we want the current progress to sit above the CTA. So the button goes
  // into extraContent (rendered after the info box) instead, replicating
  // the brand button markup from email-template.ts renderButton().
  const ctaHtml = `<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
        <tr><td style="padding:8px 0;">
          <a href="${ctaUrl}" target="_blank" style="display:inline-block;background-color:#0066FF;color:#ffffff;font-weight:bold;font-size:16px;padding:12px 24px;border-radius:10px;text-decoration:none;margin:0 8px 8px 0;">Onlinekurs fortsetzen</a>
        </td></tr>
      </table>`;
  return {
    subject: "Dein Onlinekurs vor dem Praxiskurs",
    html: buildEmailHtml({
      firstName,
      intro: `${timing} ist Dein Praxiskurs. Zur Teilnahme musst Du vorher mindestens ${ONLINE_COURSE_MIN_PCT} % des Onlinekurses abgeschlossen haben. Diese Voraussetzung sichert die Sicherheit der Patient:innen und die Qualität der Ausbildung.`,
      infoRows: [
        { label: "Dein aktueller Fortschritt", value: progressLabel },
      ],
      note: `Bitte arbeite die noch fehlenden Einheiten rechtzeitig vor dem Kurstag durch. Ohne die erforderlichen ${ONLINE_COURSE_MIN_PCT} % können wir Dich aus Gründen der Patient:innensicherheit nicht am Praxiskurs teilnehmen lassen.`,
      extraContent: ctaHtml,
      closing:
        "Bei Fragen sind wir gerne für Dich da.<br><br>Liebe Grüße,<br>Dein EPHIA-Team",
    }),
  };
}

/**
 * Reminds participants of an upcoming Praxiskurs (Praxis/Kombi/Premium)
 * who have NOT yet reached the required online-course completion mark
 * ({@link ONLINE_COURSE_MIN_PCT}%). Runs as a pass inside the daily
 * send-reminders batch.
 *
 * For each course_sessions row whose praxis day is within the next
 * {@link REMINDER_WINDOW_DAYS} days and whose template has an online
 * course (online_course_id set), it looks up each not-yet-reminded
 * participant's LearnWorlds progress for that course. Anyone below the
 * mark gets one email that states the requirement and shows their
 * current completion. Sent exactly once per booking, locked via
 * course_bookings.praxis_reminder_sent_at.
 *
 * Skip conditions (silent, no email, no stamp):
 *  - Template has no online_course_id (no online prerequisite to check).
 *  - Participant already at/above the mark.
 *  - Booking already reminded (praxis_reminder_sent_at set) or not in
 *    the 'booked' state (cancelled/refunded/completed excluded upstream).
 *
 * Participants without a linked LearnWorlds account can't be measured,
 * so they're treated as "noch nicht begonnen" (0%) and reminded.
 */
export async function sendPraxisOnlineReminders(
  supabase: SupabaseClient,
): Promise<SendResult> {
  const result: SendResult = { sent: 0, skipped: 0, errors: 0 };

  const todayIso = berlinDateIso(new Date());
  const windowEndIso = berlinDateIso(
    new Date(Date.now() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000),
  );

  // Upcoming praxis days from today (inclusive) up to the window end.
  const { data: sessions, error: sessErr } = await supabase
    .from("course_sessions")
    .select(
      `id, template_id, date_iso,
       course_templates:template_id (
         id, title, course_label_de, online_course_id, lw_slug_online
       )`,
    )
    .gte("date_iso", todayIso)
    .lte("date_iso", windowEndIso);

  if (sessErr) {
    console.error("praxis online reminder: session query failed", sessErr);
    return result;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proband-innen.ephia.de";

  // Cache LW progress per user across the whole pass so a participant
  // with bookings on more than one upcoming session is fetched once.
  const progressCache = new Map<string, Map<string, number>>();
  async function getProgressMap(lwUserId: string): Promise<Map<string, number>> {
    const cached = progressCache.get(lwUserId);
    if (cached) return cached;
    // Pace LW calls (~2 req/s documented limit) — one fetch per distinct
    // user, spaced out so a busy window doesn't burst the API.
    await sleep(300);
    const rows = await listUserProgress(lwUserId);
    const map = buildProgressMap(rows);
    progressCache.set(lwUserId, map);
    return map;
  }

  const sessionRows = (sessions ?? []) as unknown as SessionWithTemplate[];
  for (const session of sessionRows) {
    const template = pickOne(session.course_templates);
    const onlineCourseId = template?.online_course_id?.trim() || "";
    // No online course tied to this template → no prerequisite to check.
    if (!template || !onlineCourseId) continue;

    const { data: bookings, error: bookingErr } = await supabase
      .from("course_bookings")
      .select(
        `id, email, first_name, last_name, course_type, status, praxis_reminder_sent_at, auszubildende_id,
         auszubildende:auszubildende_id ( first_name, last_name, lw_user_id )`,
      )
      .eq("session_id", session.id)
      .eq("status", "booked")
      .is("praxis_reminder_sent_at", null)
      .in("course_type", [...PRAXIS_COURSE_TYPES]);

    if (bookingErr) {
      console.error(
        `praxis online reminder: booking query failed for session ${session.id}`,
        bookingErr,
      );
      continue;
    }

    const daysUntil = calendarDaysUntilBerlin(session.date_iso, todayIso);
    const slug = template.lw_slug_online?.trim() || onlineCourseId;
    const ctaUrl = `${appUrl}/api/auth/lw-sso?redirectUrl=${encodeURIComponent(
      `https://learn.ephia.de/course/${slug}`,
    )}`;

    const bookingRows = (bookings ?? []) as unknown as BookingRow[];
    for (const booking of bookingRows) {
      try {
        if (!booking.email) continue;
        const azubi = pickOne(booking.auszubildende);
        const lwUserId = azubi?.lw_user_id?.trim() || "";

        // Resolve completion for this online course. No LW account →
        // treat as not started (null → shown as "noch nicht begonnen").
        let pct: number | null;
        if (lwUserId) {
          const map = await getProgressMap(lwUserId);
          pct = map.get(onlineCourseId) ?? 0;
        } else {
          pct = null;
        }

        // Already met the requirement → nothing to remind. Leave the
        // stamp null so nobody is locked out of a future reminder if the
        // rule ever changes; the participant simply isn't re-mailed
        // because they stay above the mark.
        if ((pct ?? 0) >= ONLINE_COURSE_MIN_PCT) {
          result.skipped += 1;
          continue;
        }

        const firstName =
          (azubi?.first_name || "").trim() || booking.first_name || "Du";
        const progressLabel =
          pct === null ? "noch nicht begonnen" : `${Math.round(pct)} %`;
        const timing =
          daysUntil <= 1
            ? "morgen"
            : daysUntil === REMINDER_WINDOW_DAYS
              ? "in einer Woche"
              : `in ${daysUntil} Tagen`;

        const { subject, html } = buildPraxisOnlineReminderEmail({
          firstName,
          timing,
          progressLabel,
          ctaUrl,
        });

        await sendEmail(booking.email, subject, html);

        await supabase
          .from("course_bookings")
          .update({ praxis_reminder_sent_at: new Date().toISOString() })
          .eq("id", booking.id);

        result.sent += 1;
      } catch (err) {
        result.errors += 1;
        console.error(
          `praxis online reminder: send failed for booking ${booking.id}`,
          err,
        );
      }
    }
  }

  return result;
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "EPHIA <customerlove@ephia.de>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend error: ${errText}`);
  }

  // Mirror into the customerlove Gmail Sent folder so the reminder shows
  // up in the contact's email history. Best-effort — a Gmail outage must
  // not fail the send (which would also undo the stamp upstream).
  try {
    await archiveSentMessage({ to, subject, html });
  } catch (archiveErr) {
    console.error("archiveSentMessage failed (non-fatal):", archiveErr);
  }
}

// Berlin calendar date (YYYY-MM-DD) for a given instant.
function berlinDateIso(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

// Whole-day distance between two YYYY-MM-DD strings (target minus today).
function calendarDaysUntilBerlin(targetIso: string, todayIso: string): number {
  const [tY, tM, tD] = targetIso.split("-").map(Number);
  const [nY, nM, nD] = todayIso.split("-").map(Number);
  const targetUTC = Date.UTC(tY, tM - 1, tD);
  const nowUTC = Date.UTC(nY, nM - 1, nD);
  return Math.round((targetUTC - nowUTC) / (1000 * 60 * 60 * 24));
}
