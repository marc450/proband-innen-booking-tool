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

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;

    // Build form-encoded body for Stripe API
    const params = new URLSearchParams();
    params.set("mode", "setup");
    params.set("locale", "de");
    params.set("billing_address_collection", "required");
    params.set("payment_method_types[0]", "card");
    params.set("payment_method_types[1]", "sepa_debit");
    params.set("custom_text[submit][message]",
      "Du wirst jetzt NICHT belastet. Wir speichern Deine Zahlungsdaten nur fuer den Fall einer No-Show-Gebuehr (50,00 EUR) bei Nichterscheinen oder Absage weniger als 48h vor dem Termin.");
    params.set("metadata[slotId]", slotId);
    params.set("metadata[phone]", phone || "");
    params.set("success_url", `${successUrl}?session_id={CHECKOUT_SESSION_ID}`);
    params.set("cancel_url", cancelUrl);
    if (email) params.set("customer_email", email);

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await res.json();

    if (!res.ok) {
      console.error("Stripe error:", session);
      return new Response(
        JSON.stringify({ error: session?.error?.message || "Stripe error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ checkoutUrl: session.url, sessionId: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
