import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendProfileReminderEmail } from "@/lib/post-purchase";

// Sends the customer the same "complete your profile" email that
// sendProfileReminderEmail in lib/post-purchase already builds — just
// triggered manually from the dashboard instead of an automated flow.
// Used by the mail-icon button next to the "unvollständiges Profil"
// pill on /dashboard/kurse/[sessionId].

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return profile?.role === "admin" ? user : null;
}

interface RequestBody {
  bookingId?: string;
}

export async function POST(req: NextRequest) {
  const caller = await assertAdmin();
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const bookingId = (body.bookingId ?? "").trim();
  if (!bookingId) {
    return NextResponse.json({ error: "bookingId required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("course_bookings")
    .select("id, email, first_name")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ error: "Buchung nicht gefunden." }, { status: 404 });
  }
  if (!booking.email) {
    return NextResponse.json({ error: "Buchung hat keine E-Mail-Adresse." }, { status: 400 });
  }

  try {
    await sendProfileReminderEmail(
      booking.email as string,
      (booking.first_name as string | null) || "Kolleg:in",
      booking.id as string,
    );
  } catch (err) {
    console.error("send-profile-reminder failed", err);
    return NextResponse.json({ error: "Versand fehlgeschlagen." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
