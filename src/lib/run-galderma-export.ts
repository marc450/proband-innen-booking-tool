// Core Galderma export pass, shared by the daily sweep (/api/send-reminders,
// the same cron that ships post-praxis certificates) and a thin manual
// trigger route. Sends every consenting participant of an already-passed
// Praxis-/Kombikurs to Galderma exactly once, then stamps exported_at so
// they are never sent again.
//
// Selection is `date_iso < today` (Berlin), not exactly "yesterday": the
// normal case is the morning after the course, but a missed daily run can
// never silently drop a contact, the next run picks them up. exported_at
// keeps it idempotent regardless of how often this runs.
//
// Gated by GALDERMA_EXPORT_LIVE: until the legal sign-offs are done this
// runs but sends nothing.

import type { createAdminClient } from "@/lib/supabase/admin";
import {
  buildGaldermaXlsx,
  galdermaExportFilename,
  type GaldermaExportRow,
} from "@/lib/partner-galderma-export";
import { sendGaldermaExportEmail } from "@/lib/partner-galderma-emails";
import {
  GALDERMA_PARTNER,
  GALDERMA_EXPORT_LIVE,
  GALDERMA_RECIPIENT_TO,
  GALDERMA_RECIPIENT_CC,
} from "@/lib/partner-galderma";

type ConsentRow = {
  id: string;
  course_booking_id: string;
  signed_payload: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    course_title?: string;
    course_date?: string;
  } | null;
};

export interface GaldermaExportResult {
  skipped?: string;
  sessions: number;
  exported: number;
  errors: number;
}

export async function runGaldermaExport(
  admin: ReturnType<typeof createAdminClient>,
): Promise<GaldermaExportResult> {
  if (!GALDERMA_EXPORT_LIVE) {
    return { skipped: "export-gated-off", sessions: 0, exported: 0, errors: 0 };
  }

  const todayBerlin = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
  }).format(new Date()); // yyyy-mm-dd

  // 1. Past sessions (course day fully over).
  const { data: sessions, error: sessErr } = await admin
    .from("course_sessions")
    .select("id, date_iso, course_templates:template_id(title, course_label_de)")
    .lt("date_iso", todayBerlin);
  if (sessErr) {
    console.error("galderma-export: session query failed:", sessErr);
    return { sessions: 0, exported: 0, errors: 1 };
  }
  if (!sessions || sessions.length === 0) {
    return { sessions: 0, exported: 0, errors: 0 };
  }

  const sessionIds = sessions.map((s) => s.id as string);
  const sessionMeta = new Map<string, { title: string; dateIso: string }>(
    sessions.map((s) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const t = s.course_templates as any;
      return [
        s.id as string,
        {
          title: t?.course_label_de || t?.title || "EPHIA-Kurs",
          dateIso: s.date_iso as string,
        },
      ];
    }),
  );

  // 2. Bookings on those sessions → booking→session map.
  const { data: bookings } = await admin
    .from("course_bookings")
    .select("id, session_id")
    .in("session_id", sessionIds)
    .neq("status", "cancelled");
  const sessionByBooking = new Map<string, string>(
    (bookings ?? []).map((b) => [b.id as string, b.session_id as string]),
  );
  const bookingIds = Array.from(sessionByBooking.keys());
  if (bookingIds.length === 0) {
    return { sessions: sessions.length, exported: 0, errors: 0 };
  }

  // 3. Exportable consents.
  const { data: consentData } = await admin
    .from("partner_data_consents")
    .select("id, course_booking_id, signed_payload")
    .eq("partner", GALDERMA_PARTNER)
    .in("course_booking_id", bookingIds)
    .not("consented_at", "is", null)
    .is("revoked_at", null)
    .is("exported_at", null);
  const consents = (consentData ?? []) as ConsentRow[];
  if (consents.length === 0) {
    return { sessions: sessions.length, exported: 0, errors: 0 };
  }

  // 4. Group by session.
  const bySession = new Map<string, ConsentRow[]>();
  for (const c of consents) {
    const sid = sessionByBooking.get(c.course_booking_id);
    if (!sid) continue;
    if (!bySession.has(sid)) bySession.set(sid, []);
    bySession.get(sid)!.push(c);
  }

  const humanDate = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString("de-DE", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Europe/Berlin",
    });

  let exported = 0;
  let errors = 0;

  for (const [sessionId, rows] of bySession) {
    const meta = sessionMeta.get(sessionId)!;
    const exportRows: GaldermaExportRow[] = rows.map((c) => {
      const p = c.signed_payload ?? {};
      return {
        vorname: p.first_name ?? "",
        nachname: p.last_name ?? "",
        email: p.email ?? "",
        telefon: p.phone ?? "",
        anschrift: p.address ?? "",
        kurs_titel: p.course_title ?? meta.title,
        kurs_datum: p.course_date ?? humanDate(meta.dateIso),
      };
    });

    const filename = galdermaExportFilename(meta.dateIso, meta.title);
    const xlsxBase64 = await buildGaldermaXlsx(exportRows);

    const emailResult = await sendGaldermaExportEmail({
      courseTitle: meta.title,
      courseDate: humanDate(meta.dateIso),
      participantCount: exportRows.length,
      xlsxFilename: filename,
      xlsxBase64,
    });

    if (!emailResult.ok) {
      // Leave exported_at null so the next daily run retries.
      console.error(
        `galderma-export: send failed for session ${sessionId}: ${emailResult.error}`,
      );
      errors += 1;
      continue;
    }

    const consentIds = rows.map((c) => c.id);
    await admin.from("partner_data_exports").insert({
      partner: GALDERMA_PARTNER,
      course_session_id: sessionId,
      participant_count: exportRows.length,
      participant_ids: consentIds,
      payload_snapshot: exportRows,
      triggered_by: "cron",
      resend_message_id: emailResult.messageId,
      resend_status: "sent",
      recipient_to: GALDERMA_RECIPIENT_TO,
      recipient_cc: GALDERMA_RECIPIENT_CC,
    });
    await admin
      .from("partner_data_consents")
      .update({ exported_at: new Date().toISOString() })
      .in("id", consentIds);

    exported += exportRows.length;
  }

  console.log(
    `galderma-export: ${exported} participant(s) across ${bySession.size} session(s).`,
  );
  return { sessions: sessions.length, exported, errors };
}
