import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

// Daily Galderma export. One day after a Praxis-/Kombikurs, send every
// consenting participant (consented, not revoked, not yet exported) to
// Galderma exactly once, then stamp exported_at so they're never sent
// again. Protected with CRON_SECRET; recommended schedule 0 22 * * * UTC
// (midnight German time) like the other crons.
//
// Gated by GALDERMA_EXPORT_LIVE: until the legal sign-offs are done the
// cron runs but sends nothing.

export const dynamic = "force-dynamic";

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

function yesterdayBerlinIso(): string {
  // "Today" in Berlin, then step back one day, all in the Berlin calendar.
  const todayBerlin = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
  }).format(new Date()); // yyyy-mm-dd
  const d = new Date(`${todayBerlin}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!GALDERMA_EXPORT_LIVE) {
    console.log("galderma-export: GALDERMA_EXPORT_LIVE is off, skipping sends.");
    return NextResponse.json({ skipped: "export-gated-off" });
  }

  const admin = createAdminClient();
  const targetDate = yesterdayBerlinIso();

  // 1. Sessions that ran yesterday.
  const { data: sessions, error: sessErr } = await admin
    .from("course_sessions")
    .select("id, date_iso, course_templates:template_id(title, course_label_de)")
    .eq("date_iso", targetDate);
  if (sessErr) {
    console.error("galderma-export: session query failed:", sessErr);
    return NextResponse.json({ error: sessErr.message }, { status: 500 });
  }
  if (!sessions || sessions.length === 0) {
    return NextResponse.json({ date: targetDate, sessions: 0, exported: 0 });
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
    return NextResponse.json({ date: targetDate, sessions: sessions.length, exported: 0 });
  }

  // 3. Exportable consents for those bookings.
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
    return NextResponse.json({ date: targetDate, sessions: sessions.length, exported: 0 });
  }

  // 4. Group consents by session.
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

  let totalExported = 0;
  const results: Array<{ sessionId: string; count: number; ok: boolean }> = [];

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
    const xlsxBase64 = buildGaldermaXlsx(exportRows);

    const emailResult = await sendGaldermaExportEmail({
      courseTitle: meta.title,
      courseDate: humanDate(meta.dateIso),
      participantCount: exportRows.length,
      xlsxFilename: filename,
      xlsxBase64,
    });

    if (!emailResult.ok) {
      // Leave exported_at null so the next run retries. Log loudly.
      console.error(
        `galderma-export: send failed for session ${sessionId}: ${emailResult.error}`,
      );
      results.push({ sessionId, count: exportRows.length, ok: false });
      continue;
    }

    const consentIds = rows.map((c) => c.id);
    const nowIso = new Date().toISOString();

    // Audit row first, then stamp exported_at on the consents.
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
      .update({ exported_at: nowIso })
      .in("id", consentIds);

    totalExported += exportRows.length;
    results.push({ sessionId, count: exportRows.length, ok: true });
  }

  console.log(
    `galderma-export: ${targetDate} → ${totalExported} participant(s) across ${results.length} session(s).`,
  );
  return NextResponse.json({
    date: targetDate,
    sessions: sessions.length,
    exported: totalExported,
    results,
  });
}
