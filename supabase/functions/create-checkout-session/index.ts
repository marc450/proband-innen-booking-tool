import Stripe from "npm:stripe@14.14.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
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

    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      locale: "de",
      ...(email ? { customer_email: email } : {}),
      payment_method_types: ["card", "sepa_debit"],
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
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
