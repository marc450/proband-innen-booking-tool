import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

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
    const { sessionId } = await req.json();

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "sessionId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Retrieve the Checkout Session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["setup_intent"],
    });

    if (session.status !== "complete") {
      return new Response(
        JSON.stringify({ error: "Checkout session is not complete" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const setupIntent = session.setup_intent as Stripe.SetupIntent;
    if (!setupIntent || setupIntent.status !== "succeeded") {
      return new Response(
        JSON.stringify({ error: "Payment method not confirmed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customerId = setupIntent.customer as string;
    const paymentMethodId = setupIntent.payment_method as string;

    // Extract booking data from session metadata
    const {
      slotId,
      firstName,
      lastName,
      email,
      phone,
      addressStreet,
      addressZip,
      addressCity,
    } = session.metadata || {};

    if (!slotId || !firstName || !lastName || !email) {
      return new Response(
        JSON.stringify({ error: "Missing booking data in session metadata" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check remaining capacity
    const { data: slot, error: slotError } = await supabase
      .from("available_slots")
      .select("remaining_capacity")
      .eq("id", slotId)
      .single();

    if (slotError || !slot) {
      return new Response(
        JSON.stringify({ error: "Slot not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (slot.remaining_capacity <= 0) {
      return new Response(
        JSON.stringify({ error: "Dieser Termin ist leider bereits ausgebucht." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for duplicate booking (same email + slot)
    const { data: existing } = await supabase
      .from("bookings")
      .select("id")
      .eq("slot_id", slotId)
      .eq("email", email)
      .in("status", ["booked", "attended"])
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "Du hast bereits eine Buchung fuer diesen Termin." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        slot_id: slotId,
        name: `${firstName} ${lastName}`,
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone || null,
        address_street: addressStreet || null,
        address_zip: addressZip || null,
        address_city: addressCity || null,
        stripe_customer_id: customerId,
        stripe_payment_method_id: paymentMethodId,
        stripe_checkout_session_id: sessionId,
        status: "booked",
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Booking insert error:", bookingError);
      return new Response(
        JSON.stringify({ error: "Buchung konnte nicht erstellt werden." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ booking }),
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
