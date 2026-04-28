import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Manually attach an Auszubildende:r to a course (session + template)
// for legacy-cleanup purposes. Bypasses the entire create_course_booking
// RPC so NO side effects fire:
//   - no Stripe charge
//   - no Resend confirmation email
//   - no Slack notification
//   - no WhatsApp invite
//   - no capacity check (Marc may need to record bookings beyond max)
//
// `updateSeats` is the only optional side effect, off by default. Turn
// it on when the manual booking represents a real attendee that should
// count toward the session's booked_seats; leave off when the seat
// count was already correct (e.g. session already happened, capacity
// not enforced anymore).
//
// Admin-only; staff role check matches the rest of /api/admin/*.

type CourseType = "Onlinekurs" | "Praxiskurs" | "Kombikurs" | "Premium";
type BookingStatus = "booked" | "completed" | "cancelled" | "refunded";

const VALID_COURSE_TYPES: CourseType[] = [
  "Onlinekurs",
  "Praxiskurs",
  "Kombikurs",
  "Premium",
];
const VALID_STATUSES: BookingStatus[] = [
  "booked",
  "completed",
  "cancelled",
  "refunded",
];

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return null;
  return user;
}

export async function POST(req: NextRequest) {
  const admin = await assertAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const sessionId = (body.sessionId as string | null) || null;
  const courseType = body.courseType as CourseType | undefined;
  const auszubildendeId = body.auszubildendeId as string | undefined;
  const status = (body.status as BookingStatus | undefined) || "completed";
  const updateSeats = Boolean(body.updateSeats);
  const amountPaid =
    typeof body.amountPaid === "number" ? body.amountPaid : null;

  if (!sessionId || !courseType || !auszubildendeId) {
    return NextResponse.json(
      { error: "sessionId, courseType, auszubildendeId required" },
      { status: 400 },
    );
  }
  if (!VALID_COURSE_TYPES.includes(courseType)) {
    return NextResponse.json({ error: "Invalid courseType" }, { status: 400 });
  }
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const sb = createAdminClient();

  // Derive templateId from the session row so the caller doesn't need
  // to thread it through. Also catches the bad case where sessionId
  // doesn't exist before we hit the auszubildende lookup.
  const { data: session } = await sb
    .from("course_sessions")
    .select("id, template_id, max_seats, booked_seats")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) {
    return NextResponse.json(
      { error: "Kurstermin nicht gefunden" },
      { status: 404 },
    );
  }
  const templateId = session.template_id as string;

  // Fetch the auszubildende so we can copy the snapshot fields onto the
  // booking row (matches what the public booking flow does, just
  // without Stripe).
  const { data: azubi, error: azubiErr } = await sb
    .from("auszubildende")
    .select("id, email, first_name, last_name, phone, profile_complete")
    .eq("id", auszubildendeId)
    .maybeSingle();
  if (azubiErr) {
    return NextResponse.json({ error: azubiErr.message }, { status: 500 });
  }
  if (!azubi) {
    return NextResponse.json(
      { error: "Auszubildende:r nicht gefunden" },
      { status: 404 },
    );
  }

  // Direct insert. No RPC. No side effects.
  const { data: inserted, error: insErr } = await sb
    .from("course_bookings")
    .insert({
      session_id: sessionId,
      template_id: templateId,
      course_type: courseType,
      auszubildende_id: auszubildendeId,
      first_name: azubi.first_name,
      last_name: azubi.last_name,
      email: azubi.email,
      phone: azubi.phone,
      profile_complete: azubi.profile_complete ?? false,
      status,
      amount_paid: amountPaid,
      // Stripe-related columns explicitly null — this booking did not
      // go through Stripe.
      stripe_checkout_session_id: null,
      stripe_customer_id: null,
    })
    .select("id")
    .single();
  if (insErr || !inserted) {
    return NextResponse.json(
      { error: insErr?.message || "Insert failed" },
      { status: 500 },
    );
  }

  if (updateSeats && sessionId) {
    // Bump booked_seats by 1. Same trick the RPC uses; race-safe under
    // PostgreSQL's row-locking on UPDATE ... = ... + 1.
    await sb.rpc("increment_session_seats", { p_session_id: sessionId }).then(
      // Fall back to a manual update if the RPC isn't installed (it's
      // not part of the original 018 migration). Best-effort.
      async (res: { error: { message?: string } | null }) => {
        if (res.error) {
          const { data: cur } = await sb
            .from("course_sessions")
            .select("booked_seats")
            .eq("id", sessionId)
            .maybeSingle();
          if (cur) {
            await sb
              .from("course_sessions")
              .update({ booked_seats: (cur.booked_seats || 0) + 1 })
              .eq("id", sessionId);
          }
        }
      },
    );
  }

  return NextResponse.json({ ok: true, bookingId: inserted.id });
}
