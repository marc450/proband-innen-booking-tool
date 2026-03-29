import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildOnlinekursEmail,
  buildPraxiskursEmail,
  buildKombikursEmail,
  buildCommunityInviteEmail,
  buildInvoiceEmail,
  formatDateDe,
} from "@/lib/course-email-templates";
import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;
const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const LEARNWORLDS_API_URL = process.env.LEARNWORLDS_API_URL;
const LEARNWORLDS_CLIENT_ID = process.env.LEARNWORLDS_CLIENT_ID;
const LEARNWORLDS_ACCESS_TOKEN = process.env.LEARNWORLDS_ACCESS_TOKEN;

const stripe = new Stripe(STRIPE_SECRET_KEY);

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  attachments?: { filename: string; content: string }[]
) {
  if (!RESEND_API_KEY) return;
  const payload: Record<string, unknown> = {
    from: "EPHIA <customerlove@ephia.de>",
    to: [to],
    subject,
    html,
  };
  if (attachments?.length) {
    payload.attachments = attachments;
  }
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

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

// LearnWorlds: create user if needed, then enroll in course
async function enrollInLearnWorlds(email: string, courseId: string, firstName?: string, lastName?: string) {
  if (!LEARNWORLDS_API_URL || !LEARNWORLDS_CLIENT_ID || !LEARNWORLDS_ACCESS_TOKEN) {
    console.warn("LearnWorlds env vars not configured, skipping enrollment");
    return;
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${LEARNWORLDS_ACCESS_TOKEN}`,
    "Lw-Client": LEARNWORLDS_CLIENT_ID,
  };
  const baseUrl = LEARNWORLDS_API_URL.replace(/\/$/, "");

  try {
    // Step 1: Create user (no-op if already exists)
    const createBody: Record<string, unknown> = { email, username: email };
    if (firstName) createBody.first_name = firstName;
    if (lastName) createBody.last_name = lastName;

    const createRes = await fetch(`${baseUrl}/v2/users`, {
      method: "POST",
      headers,
      body: JSON.stringify(createBody),
    });
    const createText = await createRes.text();
    console.log(`LearnWorlds create user: ${createRes.status} ${createText}`);

    // Step 2: Enroll in course via /v2/enrollments
    const enrollRes = await fetch(`${baseUrl}/v2/enrollments`, {
      method: "POST",
      headers,
      body: JSON.stringify({ user_id: email, product_id: courseId, product_type: "course" }),
    });

    const enrollText = await enrollRes.text();
    if (!enrollRes.ok) {
      console.error(`LearnWorlds enrollment error: ${enrollRes.status} ${enrollText}`);
      return;
    }

    console.log(`LearnWorlds: enrolled ${email} in course ${courseId} — ${enrollText}`);
  } catch (err) {
    console.error("LearnWorlds enrollment failed:", err);
  }
}

function computeEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const totalMinutes = h * 60 + m + durationMinutes;
  const endH = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const endM = String(totalMinutes % 60).padStart(2, "0");
  return `${endH}:${endM}`;
}

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

  const courseType = metadata.courseType as "Onlinekurs" | "Praxiskurs" | "Kombikurs";
  const templateId = metadata.templateId;
  const sessionId = metadata.sessionId || null;
  const sessionLabel = metadata.sessionLabel || "";
  const courseKey = metadata.courseKey;
  const checkoutSessionId = session.id;

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

  // Fetch template for email content
  const { data: template } = await supabase
    .from("course_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  const courseLabelDe = template?.course_label_de || template?.title || "Kurs";

  // Send confirmation email (no invoice attachment — that comes via invoice.paid)
  if (email) {
    try {
      let emailHtml: string;
      let emailSubject: string;

      if (courseType === "Onlinekurs") {
        const courseName = template?.name_online || courseLabelDe;
        emailSubject = `Buchungsbestätigung: ${courseName}`;
        emailHtml = buildOnlinekursEmail(firstName, courseName);
      } else if (courseType === "Praxiskurs") {
        const courseName = template?.name_praxis || courseLabelDe;
        emailSubject = `Buchungsbestätigung: ${courseName}`;

        let praxisInfo = { address: "", dateFormatted: sessionLabel, startTime: "", endTime: "", instructor: "" };
        if (sessionId) {
          const { data: sess } = await supabase
            .from("course_sessions")
            .select("*")
            .eq("id", sessionId)
            .single();
          if (sess) {
            praxisInfo = {
              address: sess.address || "",
              dateFormatted: sess.date_iso ? formatDateDe(sess.date_iso) : sess.label_de || "",
              startTime: sess.start_time || "",
              endTime: sess.start_time && sess.duration_minutes
                ? computeEndTime(sess.start_time, sess.duration_minutes)
                : "",
              instructor: sess.instructor_name || "",
            };
          }
        }
        emailHtml = buildPraxiskursEmail(firstName, courseName, praxisInfo);
      } else {
        const courseName = template?.name_kombi || courseLabelDe;
        emailSubject = `Buchungsbestätigung: ${courseName}`;

        let praxisInfo = { address: "", dateFormatted: sessionLabel, startTime: "", endTime: "", instructor: "" };
        if (sessionId) {
          const { data: sess } = await supabase
            .from("course_sessions")
            .select("*")
            .eq("id", sessionId)
            .single();
          if (sess) {
            praxisInfo = {
              address: sess.address || "",
              dateFormatted: sess.date_iso ? formatDateDe(sess.date_iso) : sess.label_de || "",
              startTime: sess.start_time || "",
              endTime: sess.start_time && sess.duration_minutes
                ? computeEndTime(sess.start_time, sess.duration_minutes)
                : "",
              instructor: sess.instructor_name || "",
            };
          }
        }
        emailHtml = buildKombikursEmail(firstName, courseName, praxisInfo);
      }

      await sendEmail(email, emailSubject, emailHtml);
    } catch (emailErr) {
      console.error("Failed to send course confirmation email:", emailErr);
    }

    // Send WhatsApp community invite
    try {
      await sendEmail(
        email,
        "Willkommen in der EPHIA-Community!",
        buildCommunityInviteEmail(firstName)
      );
    } catch (inviteErr) {
      console.error("Failed to send community invite email:", inviteErr);
    }
  }

  // Enroll in LearnWorlds for Onlinekurs and Kombikurs
  if (email && (courseType === "Onlinekurs" || courseType === "Kombikurs")) {
    const onlineCourseId = template?.online_course_id;
    if (onlineCourseId) {
      try {
        await enrollInLearnWorlds(email, onlineCourseId, firstName, lastName);
      } catch (lwErr) {
        console.error("LearnWorlds enrollment error:", lwErr);
      }
    } else {
      console.warn(`No online_course_id for template ${templateId}, skipping LW enrollment`);
    }
  }

  // Send Slack notification
  if (SLACK_WEBHOOK_URL) {
    try {
      let seatsInfo = "";
      if (sessionId) {
        const { data: updatedSession } = await supabase
          .from("course_sessions")
          .select("booked_seats, max_seats")
          .eq("id", sessionId)
          .single();
        if (updatedSession) {
          seatsInfo = `${updatedSession.booked_seats}/${updatedSession.max_seats}`;
        }
      }

      await fetch(SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: [
            `*Neue Kursbuchung* :mortar_board:`,
            `*Typ:* ${courseType}`,
            `*Kurs:* ${courseLabelDe}`,
            sessionLabel ? `*Datum:* ${sessionLabel}` : null,
            seatsInfo ? `*Plätze:* ${seatsInfo}` : null,
          ].filter(Boolean).join("\n"),
        }),
      });
    } catch (slackErr) {
      console.error("Failed to send Slack notification:", slackErr);
    }
  }

  console.log(`Course booking created: ${bookingId} (${courseType} / ${courseKey})`);
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
