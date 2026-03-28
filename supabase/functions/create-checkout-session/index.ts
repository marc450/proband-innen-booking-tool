import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { slotId, email, phone, successUrl, cancelUrl } = await req.json();

    if (!slotId) {
      return new Response(
        JSON.stringify({ error: "slotId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Checkout Session in setup mode
    // Stripe collects name, email, phone, and billing address
    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      locale: "de",
      ...(email ? { customer_email: email } : {}),
      payment_method_types: ["card"],
      billing_address_collection: "required",
      custom_text: {
        submit: {
          message:
            "Du wirst jetzt NICHT belastet. Wir speichern Deine Zahlungsdaten nur fuer den Fall einer No-Show-Gebuehr (50 EUR) bei Nichterscheinen oder Absage weniger als 24h vor dem Termin. Debit- und Kreditkarten werden akzeptiert.",
        },
      },
      metadata: {
        slotId,
        phone: phone || "",
      },
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
    });

    return new Response(
      JSON.stringify({
        checkoutUrl: session.url,
        sessionId: session.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error creating checkout session:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
