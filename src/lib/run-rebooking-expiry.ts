// Releases the seat holds of Umbuchungen whose Umbuchungsgebühr was never paid
// (migration 154). Shared by the daily sweep (/api/send-reminders, the
// daily-reminders-and-certs cron) and a thin manual trigger route, exactly like
// the Galderma export pass.
//
// A pending Umbuchung holds two seats: the doctor's original seat is already
// back on sale and a seat in the target session is reserved for her. When the
// deadline passes unpaid, expire_course_rebooking_requests hands the target
// seat back and restores her on her original date, where she is still
// officially booked until she pays (AGB Ziffer 6).
//
// Cadence: once a day is enough, even though the deadline is a timestamp. The
// booking itself never moved, so a late run only means the seat COUNT lags —
// she still shows up on her original participant list the whole time, badged
// "Umbuchung offen". Idempotent: the RPC only ever picks up rows that are still
// pending AND still holding seats, so extra runs are free.

import type { createAdminClient } from "@/lib/supabase/admin";

const SLACK_WEBHOOK_URL_COURSES = process.env.SLACK_WEBHOOK_URL_COURSES;

interface ExpiredHold {
  request_id: string;
  booking_id: string;
  from_session_id: string | null;
  to_session_id: string;
  overbooked: boolean;
}

export interface RebookingExpiryResult {
  expired: number;
  overbooked: number;
  errors: number;
}

export async function runRebookingExpiry(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<RebookingExpiryResult> {
  const { data, error } = await supabase.rpc("expire_course_rebooking_requests");

  if (error) {
    console.error("rebooking expiry error:", error);
    return { expired: 0, overbooked: 0, errors: 1 };
  }

  const expired = (data ?? []) as ExpiredHold[];
  if (expired.length === 0) {
    return { expired: 0, overbooked: 0, errors: 0 };
  }

  const overbooked = expired.filter((e) => e.overbooked).length;
  console.log(`rebooking expiry: ${expired.length} hold(s) released, ${overbooked} overbooked`);

  // Tell the team, so nobody discovers a lapsed Umbuchung by accident. The
  // overbooked ones are the rows that need a human: her original seat was
  // resold while the fee was outstanding, so that course is now one over.
  if (SLACK_WEBHOOK_URL_COURSES) {
    try {
      const { data: bookings } = await supabase
        .from("course_bookings")
        .select("id, first_name, last_name")
        .in(
          "id",
          expired.map((e) => e.booking_id),
        );

      const nameOf = (bookingId: string) => {
        const b = bookings?.find((row) => row.id === bookingId);
        const name = [b?.first_name, b?.last_name].filter(Boolean).join(" ");
        // Strip Slack mrkdwn control chars so a name can't inject formatting.
        return (name || "Unbekannt").replace(/[*_<>@]/g, "").slice(0, 200);
      };

      const lines = expired.map(
        (e) =>
          `• ${nameOf(e.booking_id)} — Umbuchung verfallen, der reservierte Platz ist wieder frei. Sie bleibt auf ihrem ursprünglichen Termin.` +
          (e.overbooked ? " *Achtung: dieser Termin ist jetzt überbucht.*" : ""),
      );

      await fetch(SLACK_WEBHOOK_URL_COURSES, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: [
            `*Typ:* Umbuchung(en) ohne Zahlung verfallen (${expired.length})`,
            ...lines,
          ].join("\n"),
        }),
      });
    } catch (slackErr) {
      console.error("rebooking expiry Slack ping failed (non-fatal):", slackErr);
    }
  }

  return { expired: expired.length, overbooked, errors: 0 };
}
