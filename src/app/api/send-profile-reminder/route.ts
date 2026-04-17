import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendProfileReminderEmail } from "@/lib/post-purchase";
import { normalizeEmail } from "@/lib/email-normalize";

export async function POST(req: NextRequest) {
  try {
    const { bookingId, email } = await req.json();

    if (!bookingId || !email) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch booking by id; match email in normalised form so Gmail
    // dot/alias variants still resolve correctly.
    const { data: booking } = await supabase
      .from("course_bookings")
      .select("id, email, first_name, profile_complete, profile_reminder_sent")
      .eq("id", bookingId)
      .single();

    if (
      !booking ||
      booking.profile_complete ||
      booking.profile_reminder_sent ||
      normalizeEmail(booking.email) !== normalizeEmail(email)
    ) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proband-innen.ephia.de";

    await sendProfileReminderEmail(email, booking.first_name || "dort", bookingId, baseUrl);

    // Mark as sent so we don't send again
    await supabase
      .from("course_bookings")
      .update({ profile_reminder_sent: true })
      .eq("id", bookingId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Send profile reminder error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
