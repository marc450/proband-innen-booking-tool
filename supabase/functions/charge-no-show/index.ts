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
    // Verify auth - only staff can charge
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { bookingId } = await req.json();

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: "bookingId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch booking
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (booking.status !== "no_show") {
      return new Response(
        JSON.stringify({ error: "Can only charge no-show bookings" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (booking.charge_id) {
      return new Response(
        JSON.stringify({ error: "This booking has already been charged" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!booking.stripe_customer_id || !booking.stripe_payment_method_id) {
      return new Response(
        JSON.stringify({ error: "No payment method on file for this booking" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Set default payment method on customer for invoice auto-payment
    await stripe.customers.update(booking.stripe_customer_id, {
      invoice_settings: {
        default_payment_method: booking.stripe_payment_method_id,
      },
    });

    // Create invoice item
    await stripe.invoiceItems.create({
      customer: booking.stripe_customer_id,
      amount: 5000,
      currency: "eur",
      description: `No-Show-Gebühr / No-show fee (Booking ${bookingId})`,
    });

    // Create, finalize, and pay the invoice
    const invoice = await stripe.invoices.create({
      customer: booking.stripe_customer_id,
      auto_advance: true,
      collection_method: "charge_automatically",
    });

    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
    const paidInvoice = await stripe.invoices.pay(finalizedInvoice.id);

    // Update booking with invoice ID
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ charge_id: paidInvoice.id })
      .eq("id", bookingId);

    if (updateError) {
      console.error("Failed to update booking with charge_id:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        chargeId: paidInvoice.id,
        invoiceUrl: paidInvoice.hosted_invoice_url,
        status: paidInvoice.status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error charging no-show:", err);

    // Handle Stripe card decline errors
    if (err.type === "StripeCardError") {
      return new Response(
        JSON.stringify({
          error: "Payment failed",
          decline_code: err.decline_code,
          message: err.message,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
