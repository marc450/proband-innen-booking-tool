import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildInvoiceEmail,
} from "@/lib/course-email-templates";
import {
  sendEmailViaResend,
  enrollInLearnWorlds,
  runPostPurchaseFlow,
  sendProfileReminderEmail,
  PostPurchaseData,
  CourseType,
} from "@/lib/post-purchase";
import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;
const RESEND_API_KEY = process.env.RESEND_API_KEY!;

const stripe = new Stripe(STRIPE_SECRET_KEY);

// Use sendEmailViaResend from post-purchase.ts
const sendEmail = sendEmailViaResend;

async function fetchInvoicePdf(invoiceId: string): Promise<{ filename: string; content: string } | null> {
  try {
    const invoice = await stripe.invoices.retrieve(invoiceId);
    if (!invoice.invoice_pdf) return null;

    const res = await fetch(invoice.invoice_pdf);
    if (!res.ok) return null;

    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const number = invoice.number || "rechnung";
    return { filename: `EPHIA_Rechnung_${number}.pdf`, content: base64 };
  } catch (err) {
    console.error("Failed to fetch invoice PDF:", err);
    return null;
  }
}

// enrollInLearnWorlds is imported from post-purchase.ts

// Handle invoice.paid: send invoice email with PDF attachment + store URL on booking
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const email = invoice.customer_email;
  if (!email) return;

  const customerName = invoice.customer_name || "";
  const firstName = customerName.split(" ")[0] || "";
  const hostedUrl = invoice.hosted_invoice_url || "";
  const invoicePdfUrl = invoice.invoice_pdf || "";

  // Store invoice URL on the course_booking (match via payment_intent → checkout session)
  const supabase = createAdminClient();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pi = (invoice as any).payment_intent;
    const paymentIntentId = typeof pi === "string" ? pi : pi?.id;

    if (paymentIntentId) {
      // Find the checkout session that created this payment intent
      const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntentId, limit: 1 });
      const checkoutSessionId = sessions.data[0]?.id;
      if (checkoutSessionId) {
        await supabase
          .from("course_bookings")
          .update({
            stripe_invoice_url: hostedUrl,
            stripe_invoice_pdf_url: invoicePdfUrl,
          })
          .eq("stripe_checkout_session_id", checkoutSessionId);
      }
    }
  } catch (err) {
    console.error("Failed to store invoice URL on booking:", err);
  }

  // Fetch and attach the PDF
  const pdf = await fetchInvoicePdf(invoice.id);
  const attachments = pdf ? [pdf] : undefined;

  const emailHtml = buildInvoiceEmail(firstName);
  await sendEmail(email, "Deine EPHIA-Rechnung", emailHtml, attachments);

  console.log(`Invoice email sent for ${invoice.id} to ${email}`);
}

// Handle checkout.session.completed: create booking + send confirmation
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};

  // Only process course bookings (identified by courseKey in metadata)
  if (!metadata.courseKey) return;

  const supabase = createAdminClient();

  const courseType = metadata.courseType as "Onlinekurs" | "Praxiskurs" | "Kombikurs" | "Premium";
  const templateId = metadata.templateId;
  const sessionId = metadata.sessionId || null;
  const sessionLabel = metadata.sessionLabel || "";
  const courseKey = metadata.courseKey;
  const checkoutSessionId = session.id;
  const audienceTag = metadata.audienceTag || "Humanmediziner:in";

  // Idempotency: check if this checkout session was already processed
  const { data: existing } = await supabase
    .from("course_bookings")
    .select("id")
    .eq("stripe_checkout_session_id", checkoutSessionId)
    .maybeSingle();

  if (existing) return;

  // Extract customer details
  const cd = session.customer_details as { email?: string; name?: string; phone?: string } | null;
  const email = cd?.email || "";
  const fullName = cd?.name || "";
  const phone = cd?.phone || "";
  const nameParts = fullName.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id || null;

  // Get amount paid
  const amountTotal = session.amount_total || 0;

  // Create booking via RPC (atomic seat management)
  const { data: bookingId, error: rpcError } = await supabase.rpc("create_course_booking", {
    p_session_id: sessionId,
    p_template_id: templateId,
    p_course_type: courseType,
    p_first_name: firstName,
    p_last_name: lastName,
    p_email: email,
    p_phone: phone,
    p_stripe_checkout_session_id: checkoutSessionId,
    p_stripe_customer_id: customerId,
    p_amount_paid: amountTotal,
  });

  if (rpcError) {
    console.error("Course booking RPC error:", rpcError);
    return;
  }

  // Set audience_tag on the booking
  if (bookingId && audienceTag) {
    await supabase
      .from("course_bookings")
      .update({ audience_tag: audienceTag })
      .eq("id", bookingId);
  }

  // Upsert auszubildende profile and link to booking
  if (email) {
    try {
      const { data: azubi } = await supabase
        .from("auszubildende")
        .upsert(
          { email, first_name: firstName, last_name: lastName, phone: phone || null },
          { onConflict: "email" }
        )
        .select("id")
        .single();

      if (azubi && bookingId) {
        await supabase
          .from("course_bookings")
          .update({ auszubildende_id: azubi.id })
          .eq("id", bookingId);
      }
    } catch (err) {
      console.error("Failed to upsert auszubildende:", err);
    }
  }

  // Check if this is a returning customer with a complete profile
  let isReturningCustomer = false;
  if (email) {
    const { data: azubi } = await supabase
      .from("auszubildende")
      .select("profile_complete")
      .eq("email", email)
      .maybeSingle();

    if (azubi?.profile_complete) {
      isReturningCustomer = true;
    }
  }

  if (isReturningCustomer) {
    // Returning customer: run full post-purchase flow immediately
    const postPurchaseData: PostPurchaseData = {
      bookingId: bookingId as string,
      email,
      firstName,
      lastName,
      fullName,
      phone,
      courseType: courseType as CourseType,
      courseKey,
      templateId,
      sessionId,
      sessionLabel,
      amountTotal,
      audienceTag,
    };
    await runPostPurchaseFlow(postPurchaseData);
  } else {
    // New customer: profile form is shown on the success page.
    // If they don't complete it within 30 min, a cron job sends a reminder email.
    console.log(`New customer ${email} for booking ${bookingId} — awaiting profile completion`);
  }

  console.log(`Course booking created: ${bookingId} (${courseType} / ${courseKey}) — profile ${isReturningCustomer ? "complete" : "pending"}`);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
    } else if (event.type === "invoice.paid") {
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
  }

  // Always return 200 to Stripe
  return NextResponse.json({ received: true });
}
