import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runPostPurchaseFlow, PostPurchaseData, CourseType } from "@/lib/post-purchase";

export async function POST(req: NextRequest) {
  try {
    const { bookingId, email, title, gender, specialty, birthdate, efn } = await req.json();

    if (!bookingId || !email || !title || !gender || !specialty || !birthdate) {
      return NextResponse.json({ error: "Alle Pflichtfelder müssen ausgefüllt sein." }, { status: 400 });
    }

    // Validate EFN: required for non-Zahnmedizin
    if (specialty !== "Zahnmedizin" && !efn) {
      return NextResponse.json({ error: "EFN ist erforderlich." }, { status: 400 });
    }
    if (efn && !/^\d{15}$/.test(efn)) {
      return NextResponse.json({ error: "EFN muss 15 Ziffern haben." }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch the booking and verify email matches
    const { data: booking, error: bookingError } = await supabase
      .from("course_bookings")
      .select("*")
      .eq("id", bookingId)
      .eq("email", email)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Buchung nicht gefunden." }, { status: 404 });
    }

    // Already completed — skip
    if (booking.profile_complete) {
      return NextResponse.json({ ok: true, message: "Profil bereits vervollständigt." });
    }

    // Update auszubildende profile
    if (booking.auszubildende_id) {
      await supabase
        .from("auszubildende")
        .update({
          title,
          gender,
          specialty,
          birthdate,
          efn: efn || null,
          profile_complete: true,
        })
        .eq("id", booking.auszubildende_id);
    } else if (email) {
      // Fallback: find by email
      await supabase
        .from("auszubildende")
        .update({
          title,
          gender,
          specialty,
          birthdate,
          efn: efn || null,
          profile_complete: true,
        })
        .eq("email", email);
    }

    // Get session metadata for post-purchase flow
    const metadata = booking.stripe_checkout_session_id
      ? await getMetadataFromStripe(booking.stripe_checkout_session_id)
      : null;

    // Run the full post-purchase flow
    const postPurchaseData: PostPurchaseData = {
      bookingId: booking.id,
      email: booking.email,
      firstName: booking.first_name || "",
      lastName: booking.last_name || "",
      fullName: [booking.first_name, booking.last_name].filter(Boolean).join(" "),
      phone: booking.phone || "",
      courseType: (booking.course_type || "Onlinekurs") as CourseType,
      courseKey: metadata?.courseKey || "",
      templateId: booking.template_id,
      sessionId: booking.session_id || null,
      sessionLabel: metadata?.sessionLabel || "",
      amountTotal: booking.amount_paid || 0,
      audienceTag: booking.audience_tag || "Humanmediziner:in",
      profileSpecialty: specialty,
    };

    await runPostPurchaseFlow(postPurchaseData, { skipSlack: true });

    // Send a short "profile completed" Slack message instead of the full booking notification
    const SLACK_WEBHOOK_URL_COURSES = process.env.SLACK_WEBHOOK_URL_COURSES;
    if (SLACK_WEBHOOK_URL_COURSES) {
      try {
        await fetch(SLACK_WEBHOOK_URL_COURSES, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `✅ *Profil vervollständigt:* ${postPurchaseData.fullName} (${postPurchaseData.email})`,
          }),
        });
      } catch { /* best effort */ }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Complete profile error:", err);
    return NextResponse.json({ error: "Ein Fehler ist aufgetreten." }, { status: 500 });
  }
}

// Helper to retrieve original checkout metadata from Stripe
async function getMetadataFromStripe(checkoutSessionId: string): Promise<Record<string, string> | null> {
  try {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${checkoutSessionId}`, {
      headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
    });
    if (!res.ok) return null;
    const session = await res.json();
    return session.metadata || null;
  } catch {
    return null;
  }
}
