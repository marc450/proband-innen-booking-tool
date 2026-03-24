import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptBooking } from "@/lib/encryption";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;

async function stripePost(path: string, body: Record<string, string | number>) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(
      Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v)]))
    ).toString(),
  });
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json();

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch and decrypt booking
    const { data: rawBooking, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (fetchError || !rawBooking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = decryptBooking(rawBooking);

    if (booking.status !== "no_show") {
      return NextResponse.json({ error: "Can only charge no-show bookings" }, { status: 400 });
    }

    if (booking.charge_id) {
      return NextResponse.json({ error: "This booking has already been charged" }, { status: 400 });
    }

    if (!booking.stripe_customer_id || !booking.stripe_payment_method_id) {
      return NextResponse.json({ error: "No payment method on file for this booking" }, { status: 400 });
    }

    // Set default payment method on customer
    await stripePost(`/customers/${booking.stripe_customer_id}`, {
      "invoice_settings[default_payment_method]": booking.stripe_payment_method_id,
    });

    // Create invoice item
    await stripePost("/invoiceitems", {
      customer: booking.stripe_customer_id,
      amount: 5000,
      currency: "eur",
      description: `No-Show-Gebühr / No-show fee (Booking ${bookingId})`,
    });

    // Create, finalize, and pay the invoice
    const invoice = await stripePost("/invoices", {
      customer: booking.stripe_customer_id,
      auto_advance: 1,
      collection_method: "charge_automatically",
    });

    const finalizedInvoice = await stripePost(`/invoices/${invoice.id}/finalize`, {});
    const paidInvoice = await stripePost(`/invoices/${finalizedInvoice.id}/pay`, {});

    // Update booking with invoice ID
    await supabase
      .from("bookings")
      .update({ charge_id: paidInvoice.id })
      .eq("id", bookingId);

    return NextResponse.json({
      success: true,
      chargeId: paidInvoice.id,
      status: paidInvoice.status,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
