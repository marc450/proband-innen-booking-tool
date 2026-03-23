import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function stripeGet(path: string) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
  });
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "sessionId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if this session was already used to create a booking
    const { data: existingSession } = await supabase
      .from("bookings")
      .select("id")
      .eq("stripe_checkout_session_id", sessionId)
      .maybeSingle();

    if (existingSession) {
      return new Response(
        JSON.stringify({ booking: existingSession, alreadyExists: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Retrieve Checkout Session via REST API
    const session = await stripeGet(`/checkout/sessions/${sessionId}`);

    if (session.status !== "complete") {
      return new Response(
        JSON.stringify({ error: "Checkout session is not complete" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Retrieve SetupIntent separately
    const setupIntentId = session.setup_intent;
    if (!setupIntentId) {
      return new Response(
        JSON.stringify({ error: "No setup intent found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const setupIntent = await stripeGet(`/setup_intents/${setupIntentId}`);

    if (setupIntent.status !== "succeeded") {
      return new Response(
        JSON.stringify({ error: "Payment method not confirmed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customerId = setupIntent.customer;
    const paymentMethodId = setupIntent.payment_method;
    const slotId = session.metadata?.slotId;

    if (!slotId) {
      return new Response(
        JSON.stringify({ error: "Missing slotId in session metadata" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get customer details from session (in setup mode, data is in customer_details)
    const cd = session.customer_details || {};
    const email = cd.email || "";
    const phone = session.metadata?.phone || cd.phone || "";
    const fullName = cd.name || "";
    const nameParts = fullName.split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";
    const address = cd.address || {};

    // Atomically create booking (locks slot row, checks capacity + duplicates)
    const { data: bookingId, error: rpcError } = await supabase.rpc("create_booking", {
      p_slot_id: slotId,
      p_name: fullName,
      p_first_name: firstName,
      p_last_name: lastName,
      p_email: email,
      p_phone: phone || null,
      p_address_street: address.line1 || null,
      p_address_zip: address.postal_code || null,
      p_address_city: address.city || null,
      p_stripe_customer_id: customerId,
      p_stripe_payment_method_id: paymentMethodId,
      p_stripe_checkout_session_id: sessionId,
    });

    if (rpcError) {
      console.error("Booking RPC error:", rpcError);
      const msg = rpcError.message || "";
      if (msg.includes("SLOT_FULL")) {
        return new Response(
          JSON.stringify({ error: "Dieser Termin ist leider bereits ausgebucht." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (msg.includes("DUPLICATE_BOOKING")) {
        return new Response(
          JSON.stringify({ error: "Du hast bereits eine Buchung fuer diesen Termin." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Buchung konnte nicht erstellt werden." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ booking: { id: bookingId } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error confirming booking:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
