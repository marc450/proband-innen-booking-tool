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
    const {
      firstName,
      lastName,
      email,
      phone,
      addressStreet,
      addressZip,
      addressCity,
      slotId,
      successUrl,
      cancelUrl,
    } = await req.json();

    if (!firstName || !lastName || !email || !phone || !slotId) {
      return new Response(
        JSON.stringify({ error: "Alle Pflichtfelder muessen ausgefuellt sein" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if customer already exists by email
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    let customer;
    if (existingCustomers.data.length > 0) {
      customer = await stripe.customers.update(existingCustomers.data[0].id, {
        name: `${firstName} ${lastName}`,
        email,
        phone,
        address: {
          line1: addressStreet || "",
          postal_code: addressZip || "",
          city: addressCity || "",
          country: "DE",
        },
      });
    } else {
      customer = await stripe.customers.create({
        name: `${firstName} ${lastName}`,
        email,
        phone,
        address: {
          line1: addressStreet || "",
          postal_code: addressZip || "",
          city: addressCity || "",
          country: "DE",
        },
      });
    }

    // Create Checkout Session in setup mode
    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      customer: customer.id,
      payment_method_types: ["card", "klarna"],
      custom_text: {
        submit: {
          message:
            "Du wirst jetzt NICHT belastet. Wir speichern Deine Zahlungsdaten nur fuer den Fall einer No-Show-Gebuehr (50 EUR) bei Nichterscheinen oder Absage weniger als 24h vor dem Termin.",
        },
      },
      metadata: {
        slotId,
        firstName,
        lastName,
        email,
        phone,
        addressStreet: addressStreet || "",
        addressZip: addressZip || "",
        addressCity: addressCity || "",
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
