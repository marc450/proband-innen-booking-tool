import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCourseDateBookableByProbands } from "@/lib/proband-visibility";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { slotId, email, phone, indication, successUrl, cancelUrl } = await req.json();

    if (!slotId) {
      return NextResponse.json({ error: "slotId is required" }, { status: 400 });
    }

    // Reject before opening Stripe so patients with stale tabs / direct
    // links don't end up paying for a slot we'd refuse in
    // /api/confirm-booking afterwards. See lib/proband-visibility.ts.
    {
      const admin = createAdminClient();
      const { data: slotRow } = await admin
        .from("available_slots")
        .select("course_date")
        .eq("id", slotId)
        .maybeSingle();
      if (
        !slotRow ||
        !isCourseDateBookableByProbands(slotRow.course_date as string | null)
      ) {
        return NextResponse.json(
          {
            error:
              "Dieser Termin liegt außerhalb des aktuellen Buchungsfensters.",
          },
          { status: 410 },
        );
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      locale: "de",
      ...(email ? { customer_email: email } : {}),
      payment_method_types: ["card", "sepa_debit"],
      billing_address_collection: "required",
      custom_text: {
        submit: {
          message:
            "Du wirst jetzt NICHT belastet. Wir speichern Deine Zahlungsdaten nur für den Fall einer No-Show-Gebühr (50,00 EUR) bei Nichterscheinen oder Absage weniger als 48h vor dem Termin.",
        },
      },
      metadata: {
        slotId,
        phone: phone || "",
        ...(indication ? { indication } : {}),
      },
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
    });

    return NextResponse.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (err) {
    console.error("Stripe error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Stripe error" },
      { status: 500 }
    );
  }
}
