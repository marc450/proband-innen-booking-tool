import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildInvoiceEmail,
} from "@/lib/course-email-templates";
import { buildEmailHtml } from "@/lib/email-template";
import {
  sendEmailViaResend,
  enrollInLearnWorlds,
  runPostPurchaseFlow,
  sendProfileReminderEmail,
  PostPurchaseData,
  CourseType,
} from "@/lib/post-purchase";
import { normalizeEmail } from "@/lib/email-normalize";
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
            stripe_invoice_number: invoice.number || null,
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

// Handle curriculum bundle checkout
async function handleCurriculumCheckout(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};
  const supabase = createAdminClient();

  const curriculumSlug = metadata.curriculumSlug;
  const bundleGroupId = metadata.bundleGroupId;
  const checkoutSessionId = session.id;
  const audienceTag = metadata.audienceTag || "Humanmediziner:in";

  // Parse metadata
  let courseKeys: string[] = [];
  let sessionsMap: Record<string, string | null> = {};
  let sessionLabelsMap: Record<string, string> = {};
  let templateIds: string[] = [];
  let courseTypesMap: Record<string, string> = {};

  try {
    courseKeys = JSON.parse(metadata.courseKeys || "[]");
    sessionsMap = JSON.parse(metadata.sessions || "{}");
    sessionLabelsMap = JSON.parse(metadata.sessionLabels || "{}");
    templateIds = JSON.parse(metadata.templateIds || "[]");
    courseTypesMap = JSON.parse(metadata.courseTypes || "{}");
  } catch {
    console.error("Failed to parse curriculum metadata");
    return;
  }

  // Idempotency: check if any booking with this checkout session already exists
  const { data: existing } = await supabase
    .from("course_bookings")
    .select("id")
    .eq("stripe_checkout_session_id", checkoutSessionId)
    .limit(1);

  if (existing && existing.length > 0) return;

  // Extract customer details. Stripe checkout has billing_address_collection
  // set to "required" and tax_id_collection enabled, so we also extract the
  // address + (optional) EU VAT number here and persist them on the
  // auszubildende row so they auto-fill future invoices.
  const cd = session.customer_details as {
    email?: string;
    name?: string;
    phone?: string;
    address?: {
      line1?: string | null;
      line2?: string | null;
      postal_code?: string | null;
      city?: string | null;
      state?: string | null;
      country?: string | null;
    } | null;
    tax_ids?: Array<{ type?: string | null; value?: string | null }> | null;
  } | null;
  // Normalise the email at the entry point so all downstream upserts and
  // lookups share the same canonical form (e.g. gmail.com vs googlemail.com).
  const email = normalizeEmail(cd?.email || "");
  const fullName = cd?.name || "";
  const phone = cd?.phone || "";
  const nameParts = fullName.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";
  const addressLine1 = cd?.address?.line1 || null;
  const addressPostalCode = cd?.address?.postal_code || null;
  const addressCity = cd?.address?.city || null;
  const addressCountry = cd?.address?.country || null;
  const euVatId =
    cd?.tax_ids?.find((t) => t?.type === "eu_vat")?.value?.trim() || null;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id || null;
  const amountTotal = session.amount_total || 0;

  // Calculate per-course amount (split evenly for record-keeping)
  const perCourseAmount = Math.round(amountTotal / courseKeys.length);

  // Fetch all templates
  const { data: templates } = await supabase
    .from("course_templates")
    .select("id, course_key, name_kombi, title, online_course_id, course_label_de")
    .in("id", templateIds);

  const bookingIds: string[] = [];

  // Create a booking for each course in the curriculum
  for (let i = 0; i < courseKeys.length; i++) {
    const courseKey = courseKeys[i];
    const sessionId = sessionsMap[courseKey] || null;
    const templateId = templateIds[i];

    const courseTypeForKey = courseTypesMap[courseKey] || "Kombikurs";

    const { data: bookingId, error: rpcError } = await supabase.rpc("create_course_booking", {
      p_session_id: sessionId,
      p_template_id: templateId,
      p_course_type: courseTypeForKey,
      p_first_name: firstName,
      p_last_name: lastName,
      p_email: email,
      p_phone: phone,
      p_stripe_checkout_session_id: checkoutSessionId,
      p_stripe_customer_id: customerId,
      p_amount_paid: perCourseAmount,
    });

    if (rpcError) {
      console.error(`Curriculum booking RPC error for ${courseKey}:`, rpcError);
      continue;
    }

    if (bookingId) {
      bookingIds.push(bookingId);

      // Set bundle_group_id and audience_tag
      await supabase
        .from("course_bookings")
        .update({
          bundle_group_id: bundleGroupId,
          audience_tag: audienceTag,
        })
        .eq("id", bookingId);
    }
  }

  // Upsert auszubildende profile
  if (email) {
    try {
      // Only overwrite address/vat_id columns if Stripe actually returned
      // them, so a second checkout without an address doesn't blank out a
      // previously stored one.
      const azubiRow: Record<string, unknown> = {
        email,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
      };
      if (addressLine1) azubiRow.address_line1 = addressLine1;
      if (addressPostalCode) azubiRow.address_postal_code = addressPostalCode;
      if (addressCity) azubiRow.address_city = addressCity;
      if (addressCountry) azubiRow.address_country = addressCountry;
      if (euVatId) azubiRow.vat_id = euVatId;

      const { data: azubi } = await supabase
        .from("auszubildende")
        .upsert(azubiRow, { onConflict: "email" })
        .select("id, profile_complete")
        .single();

      if (azubi) {
        // Link all bookings to the auszubildende
        for (const bookingId of bookingIds) {
          await supabase
            .from("course_bookings")
            .update({ auszubildende_id: azubi.id })
            .eq("id", bookingId);
        }

        if (azubi.profile_complete) {
          // Returning customer: run post-purchase flow for each course
          for (let i = 0; i < courseKeys.length; i++) {
            const courseKey = courseKeys[i];
            const sessionId = sessionsMap[courseKey] || null;
            const sessionLabel = sessionLabelsMap[courseKey] || "";
            const templateId = templateIds[i];
            const bookingId = bookingIds[i];
            const courseTypeForKey = courseTypesMap[courseKey] || "Kombikurs";
            if (!bookingId) continue;

            const postPurchaseData: PostPurchaseData = {
              bookingId,
              email,
              firstName,
              lastName,
              fullName,
              phone,
              courseType: courseTypeForKey as CourseType,
              courseKey,
              templateId,
              sessionId,
              sessionLabel,
              amountTotal: perCourseAmount,
              audienceTag,
            };
            await runPostPurchaseFlow(postPurchaseData);
          }
        } else {
          console.log(`New curriculum customer ${email} — awaiting profile completion`);

          // Immediate Slack notification for curriculum bundle
          const SLACK_WEBHOOK_URL_COURSES = process.env.SLACK_WEBHOOK_URL_COURSES;
          if (SLACK_WEBHOOK_URL_COURSES) {
            try {
              const betrag = amountTotal ? `€${(amountTotal / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })}` : null;
              await fetch(SLACK_WEBHOOK_URL_COURSES, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  text: [
                    `*Name:* ${fullName}`,
                    `*Typ:* Komplettpaket (Curriculum)`,
                    `*Kurse:* ${courseKeys.join(", ")}`,
                    betrag ? `*Betrag:* ${betrag}` : null,
                    `⚠️ *Profil noch nicht vollständig*`,
                  ].filter(Boolean).join("\n"),
                }),
              });
            } catch (slackErr) {
              console.error("Failed to send Slack notification for new curriculum customer:", slackErr);
            }
          }

          // Immediate basic confirmation email for curriculum
          if (email) {
            try {
              const betragStr = amountTotal ? `€${(amountTotal / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })}` : "";
              const html = buildEmailHtml({
                firstName: firstName || "Kolleg:in",
                intro: "vielen Dank für Deine Buchung des Curriculum-Komplettpakets! Wir haben Deine Zahlung erhalten.",
                infoRows: [
                  { label: "Paket", value: curriculumSlug || "Curriculum" },
                  ...(betragStr ? [{ label: "Betrag", value: betragStr }] : []),
                ],
                note: "Bitte schließe Dein Profil ab, um Zugang zu Deinen Kursen zu erhalten. Falls Du die Seite geschlossen hast, erhältst Du in Kürze eine E-Mail mit einem Link.",
              });
              await sendEmailViaResend(email, "Buchungsbestätigung: Curriculum Komplettpaket", html);
            } catch (emailErr) {
              console.error("Failed to send immediate confirmation email for curriculum:", emailErr);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to upsert auszubildende for curriculum:", err);
    }
  }

  console.log(`Curriculum bundle created: ${curriculumSlug}, ${bookingIds.length} bookings (bundleGroupId: ${bundleGroupId})`);
}

// Handle checkout.session.completed: create booking + send confirmation
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};

  // Route to merch handler for shop orders.
  if (metadata.orderType === "merch") {
    return handleMerchCheckout(session);
  }

  // Route to curriculum handler if this is a curriculum purchase
  if (metadata.curriculumSlug) {
    return handleCurriculumCheckout(session);
  }

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
  const inviteToken = metadata.inviteToken || null;

  // Idempotency: check if this checkout session was already processed
  const { data: existing } = await supabase
    .from("course_bookings")
    .select("id")
    .eq("stripe_checkout_session_id", checkoutSessionId)
    .maybeSingle();

  if (existing) return;

  // Extract customer details (incl. billing address + optional EU VAT).
  // Same shape as the curriculum branch above.
  const cd = session.customer_details as {
    email?: string;
    name?: string;
    phone?: string;
    address?: {
      line1?: string | null;
      line2?: string | null;
      postal_code?: string | null;
      city?: string | null;
      state?: string | null;
      country?: string | null;
    } | null;
    tax_ids?: Array<{ type?: string | null; value?: string | null }> | null;
  } | null;
  // Normalise the email at the entry point so all downstream upserts and
  // lookups share the same canonical form (e.g. gmail.com vs googlemail.com).
  const email = normalizeEmail(cd?.email || "");
  const fullName = cd?.name || "";
  const phone = cd?.phone || "";
  const nameParts = fullName.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";
  const addressLine1 = cd?.address?.line1 || null;
  const addressPostalCode = cd?.address?.postal_code || null;
  const addressCity = cd?.address?.city || null;
  const addressCountry = cd?.address?.country || null;
  const euVatId =
    cd?.tax_ids?.find((t) => t?.type === "eu_vat")?.value?.trim() || null;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id || null;

  // Get amount paid
  const amountTotal = session.amount_total || 0;

  // Create booking via RPC (atomic seat management). When the checkout was
  // started from a single-use invite link, route through the invite-aware
  // variant so the booking can bypass capacity and the invite is marked used
  // in the same transaction.
  const { data: bookingId, error: rpcError } = inviteToken
    ? await supabase.rpc("create_course_booking_with_invite", {
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
        p_invite_token: inviteToken,
      })
    : await supabase.rpc("create_course_booking", {
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
    // Alert via Slack so the team knows a payment was received but booking failed
    const SLACK_WEBHOOK_URL_COURSES = process.env.SLACK_WEBHOOK_URL_COURSES;
    if (SLACK_WEBHOOK_URL_COURSES) {
      try {
        await fetch(SLACK_WEBHOOK_URL_COURSES, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: [
              `🚨 *BUCHUNG FEHLGESCHLAGEN*`,
              `*Name:* ${fullName}`,
              `*E-Mail:* ${email}`,
              `*Kurs:* ${courseKey} (${courseType})`,
              `*Stripe Session:* ${checkoutSessionId}`,
              `*Fehler:* ${rpcError.message || JSON.stringify(rpcError)}`,
              `Bitte manuell prüfen!`,
            ].join("\n"),
          }),
        });
      } catch { /* best effort */ }
    }
    // Throw so Stripe gets a 500 and retries the webhook
    throw new Error(`Course booking RPC failed: ${rpcError.message}`);
  }

  // Set audience_tag on the booking
  if (bookingId && audienceTag) {
    await supabase
      .from("course_bookings")
      .update({ audience_tag: audienceTag })
      .eq("id", bookingId);
  }

  // Auto-flag session as containing a dentist booking
  if (sessionId && audienceTag === "Zahnmediziner:in") {
    await supabase
      .from("course_sessions")
      .update({ has_zahnmedizin: true })
      .eq("id", sessionId);
  }

  // Upsert auszubildende profile and link to booking
  if (email) {
    try {
      const azubiRow: Record<string, unknown> = {
        email,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
      };
      if (addressLine1) azubiRow.address_line1 = addressLine1;
      if (addressPostalCode) azubiRow.address_postal_code = addressPostalCode;
      if (addressCity) azubiRow.address_city = addressCity;
      if (addressCountry) azubiRow.address_country = addressCountry;
      if (euVatId) azubiRow.vat_id = euVatId;

      const { data: azubi } = await supabase
        .from("auszubildende")
        .upsert(azubiRow, { onConflict: "email" })
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
    // Send immediate Slack notification + basic confirmation email so the
    // team knows someone paid, even if the customer never completes the profile.
    console.log(`New customer ${email} for booking ${bookingId} — awaiting profile completion`);

    // Immediate Slack notification (with "profile pending" note)
    const SLACK_WEBHOOK_URL_COURSES = process.env.SLACK_WEBHOOK_URL_COURSES;
    if (SLACK_WEBHOOK_URL_COURSES) {
      try {
        let seatsInfo = "";
        if (sessionId) {
          const { data: sess } = await supabase.from("course_sessions").select("booked_seats, max_seats").eq("id", sessionId).single();
          if (sess) seatsInfo = `${sess.booked_seats}/${sess.max_seats}`;
        }
        const { data: tmpl } = await supabase.from("course_templates").select("course_label_de, title").eq("id", templateId).single();
        const courseLabelDe = tmpl?.course_label_de || tmpl?.title || courseKey;
        const betrag = amountTotal ? `€${(amountTotal / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })}` : null;

        await fetch(SLACK_WEBHOOK_URL_COURSES, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: [
              `*Name:* ${fullName}`,
              `*Typ:* ${courseType === "Premium" ? "Komplettpaket" : courseType}`,
              `*Kurs:* ${courseLabelDe}`,
              sessionLabel ? `*Datum:* ${sessionLabel}` : null,
              seatsInfo ? `*Plätze:* ${seatsInfo}` : null,
              betrag ? `*Betrag:* ${betrag}` : null,
              `⚠️ *Profil noch nicht vollständig*`,
            ].filter(Boolean).join("\n"),
          }),
        });
      } catch (slackErr) {
        console.error("Failed to send Slack notification for new customer:", slackErr);
      }
    }

    // Immediate basic confirmation email
    if (email) {
      try {
        const { data: tmpl } = await supabase.from("course_templates").select("course_label_de, title").eq("id", templateId).single();
        const courseLabelDe = tmpl?.course_label_de || tmpl?.title || "Kurs";
        const betragStr = amountTotal ? `€${(amountTotal / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })}` : "";

        const html = buildEmailHtml({
          firstName: firstName || "Kolleg:in",
          intro: "vielen Dank für Deine Buchung! Wir haben Deine Zahlung erhalten.",
          infoRows: [
            { label: "Kurs", value: courseLabelDe },
            { label: "Kurstyp", value: courseType || "" },
            ...(sessionLabel ? [{ label: "Datum", value: sessionLabel }] : []),
            ...(betragStr ? [{ label: "Betrag", value: betragStr }] : []),
          ],
          note: "Bitte schließe Dein Profil ab, um Zugang zu Deinem Kurs zu erhalten. Falls Du die Seite geschlossen hast, erhältst Du in Kürze eine E-Mail mit einem Link.",
        });

        await sendEmailViaResend(email, `Buchungsbestätigung: ${courseLabelDe}`, html);
      } catch (emailErr) {
        console.error("Failed to send immediate confirmation email:", emailErr);
      }
    }
  }

  console.log(`Course booking created: ${bookingId} (${courseType} / ${courseKey}) — profile ${isReturningCustomer ? "complete" : "pending"}`);
}

// Handle charge.refunded: when Stripe finishes processing a refund (triggered
// either by our cancel-course-booking flow or manually in the Stripe dashboard),
// flip the booking status from "cancelled" to "refunded" so staff can see at a
// glance that the money has actually been returned to the customer.
// ─────────────────────────────────────────────────────────────────────
// Merch shop: create merch_orders row, decrement variant stock, upsert
// the customer into auszubildende (as "auszubildende" when is_doctor,
// else "other"), fire Slack and Resend notifications.
// ─────────────────────────────────────────────────────────────────────
async function handleMerchCheckout(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};
  const supabase = createAdminClient();

  const checkoutSessionId = session.id;

  // Idempotency guard.
  const { data: existing } = await supabase
    .from("merch_orders")
    .select("id")
    .eq("stripe_checkout_session_id", checkoutSessionId)
    .maybeSingle();
  if (existing) return;

  // Pull customer + shipping details from the session.
  const cd = session.customer_details as {
    email?: string;
    name?: string;
    phone?: string;
    address?: {
      line1?: string | null;
      line2?: string | null;
      postal_code?: string | null;
      city?: string | null;
      state?: string | null;
      country?: string | null;
    } | null;
  } | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shippingDetails = (session as any).shipping_details as
    | { name?: string; address?: { line1?: string; line2?: string; postal_code?: string; city?: string; country?: string } }
    | null
    | undefined;
  const shippingAddr = shippingDetails?.address || cd?.address || {};

  const email = normalizeEmail(cd?.email || metadata.email || "");
  // Stripe returns the customer's name as a single string (e.g. "Marc Wyss").
  // The merch pre-modal no longer collects name separately, so split on the
  // first whitespace to fill first_name / last_name on both merch_orders
  // and the upserted auszubildende row.
  const fullName = cd?.name || "";
  const firstNameSplit = fullName.trim().split(/\s+/)[0] || "";
  const lastNameSplit = fullName.trim().split(/\s+/).slice(1).join(" ") || "";
  const firstName = metadata.firstName || firstNameSplit;
  const lastName = metadata.lastName || lastNameSplit;
  const phone = cd?.phone || metadata.phone || "";
  const isDoctor = metadata.isDoctor === "true";

  const variantId = metadata.variantId || null;
  const productId = metadata.productId || null;
  const productTitle = metadata.productTitle || "Merch";
  const variantName = metadata.variantName || null;
  const variantColor = metadata.variantColor || null;
  const variantSize = metadata.variantSize || null;

  // Quantity defaults to 1 for orders created before quantity support
  // shipped (older sessions don't carry the metadata key).
  const quantity = Math.max(1, Number(metadata.quantity) || 1);
  // itemGrossCents is the line-item total (unit × quantity). For legacy
  // orders the metadata only carried the unit price; treat it as the
  // total in that case so reporting math doesn't suddenly inflate when
  // we apply the new key on existing rows.
  const itemGrossCents = Number(metadata.itemGrossCents) || 0;
  const shippingGrossCents = Number(metadata.shippingGrossCents) || 0;
  // Use ?? not ||: a 100% discount code makes session.amount_total
  // a legitimate 0, and || would treat that as missing and fall back
  // to the pre-discount list price.
  const amountPaidCents = session.amount_total ?? (itemGrossCents + shippingGrossCents);
  const discountCents = session.total_details?.amount_discount ?? 0;
  const pickupAtEvent = metadata.pickupAtEvent === "true";

  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id || null;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || null;

  // Upsert the customer into auszubildende so they land in Kontakte. Doctors
  // go into the auszubildende bucket; non-doctors into "other" (Sonstige).
  let auszubildendeId: string | null = null;
  if (email) {
    try {
      const azubiRow: Record<string, unknown> = {
        email,
        first_name: firstName || null,
        last_name: lastName || null,
        phone: phone || null,
        contact_type: isDoctor ? "auszubildende" : "other",
      };
      const { data: azubi } = await supabase
        .from("auszubildende")
        .upsert(azubiRow, { onConflict: "email" })
        .select("id")
        .single();
      if (azubi) auszubildendeId = azubi.id;
    } catch (err) {
      console.error("Failed to upsert auszubildende for merch order:", err);
    }
  }

  // Create the order.
  const { data: order, error: orderErr } = await supabase
    .from("merch_orders")
    .insert({
      variant_id: variantId,
      product_id: productId,
      product_title: productTitle,
      variant_name: variantName,
      variant_color: variantColor,
      variant_size: variantSize,
      quantity,
      first_name: firstName || null,
      last_name: lastName || null,
      email,
      phone: phone || null,
      is_doctor: isDoctor,
      auszubildende_id: auszubildendeId,
      shipping_line1: shippingAddr.line1 || null,
      shipping_line2: shippingAddr.line2 || null,
      shipping_postal_code: shippingAddr.postal_code || null,
      shipping_city: shippingAddr.city || null,
      shipping_country: shippingAddr.country || null,
      item_gross_cents: itemGrossCents,
      shipping_gross_cents: shippingGrossCents,
      pickup_at_event: pickupAtEvent,
      amount_paid_cents: amountPaidCents,
      stripe_checkout_session_id: checkoutSessionId,
      stripe_payment_intent_id: paymentIntentId,
      status: "paid",
    })
    .select("id")
    .single();

  if (orderErr) {
    console.error("merch_orders insert failed:", orderErr);
    throw new Error(`merch_orders insert failed: ${orderErr.message}`);
  }

  // Atomic stock decrement. Don't blow up the webhook on OUT_OF_STOCK —
  // the payment already went through; alert staff via Slack below.
  let stockError: string | null = null;
  if (variantId) {
    const { error: stockErr } = await supabase.rpc("merch_decrement_stock", {
      p_variant_id: variantId,
      p_qty: quantity,
    });
    if (stockErr) {
      stockError = stockErr.message;
      console.error("merch_decrement_stock failed:", stockErr);
    }
  }

  // Slack notification to the revenue channel.
  const SLACK_WEBHOOK_URL_REVENUE = process.env.SLACK_WEBHOOK_URL_REVENUE;
  if (SLACK_WEBHOOK_URL_REVENUE) {
    try {
      const variantLabel = [variantColor, variantSize].filter((x) => x && x !== "one-size").join(" / ");
      const eur = (cents: number) =>
        `€${(cents / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })}`;
      const address = [
        shippingAddr.line1,
        [shippingAddr.postal_code, shippingAddr.city].filter(Boolean).join(" "),
        shippingAddr.country,
      ]
        .filter(Boolean)
        .join(", ");
      const betragSuffix = discountCents > 0
        ? ` (${eur(discountCents)} Rabatt eingelöst)`
        : pickupAtEvent
          ? ""
          : " (inkl. Versand)";
      const lines = [
        `🧢 *Neue Merch-Bestellung*`,
        `*Produkt:* ${productTitle}${variantLabel ? ` · ${variantLabel}` : ""}${quantity > 1 ? ` · *${quantity}×*` : ""}`,
        fullName ? `*Name:* ${fullName}` : null,
        email ? `*E-Mail:* ${email}` : null,
        phone ? `*Telefon:* ${phone}` : null,
        `*Ärzt:in:* ${isDoctor ? "Ja" : "Nein"}`,
        pickupAtEvent
          ? `*Lieferart:* Abholung beim Community Event`
          : address
            ? `*Lieferart:* Versand · ${address}`
            : `*Lieferart:* Versand`,
        `*Betrag:* ${eur(amountPaidCents)}${betragSuffix}`,
        stockError ? `⚠️ *Stock-Update fehlgeschlagen:* ${stockError}` : null,
      ].filter(Boolean);
      // username + icon_emoji are sent on a best-effort basis: classic
      // Incoming Webhooks honour them, modern Slack-app webhooks (which
      // is what we have today) silently ignore both fields and inherit
      // the parent app's name ("Neue Kursbuchung!"). Fixing the visible
      // header requires a Slack-side change: either rename the app or
      // create a separate "EPHIA Merch" app with its own webhook URL
      // and point SLACK_WEBHOOK_URL_REVENUE at it.
      await fetch(SLACK_WEBHOOK_URL_REVENUE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: lines.join("\n"),
          username: "EPHIA Merch",
          icon_emoji: ":shopping_bags:",
        }),
      });
    } catch (err) {
      console.error("Slack revenue notification failed:", err);
    }
  }

  // Customer confirmation email via Resend. Uses the shared
  // buildEmailHtml helper so the merch confirmation matches the course
  // confirmation emails (logo footer, Hi {firstName}, beige info box,
  // EPHIA Medical GmbH address block).
  if (email && RESEND_API_KEY) {
    try {
      const variantLabel = [variantColor, variantSize].filter((x) => x && x !== "one-size").join(" / ");
      const fmt = (cents: number) =>
        (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });

      const html = buildEmailHtml({
        firstName: firstName || "Du",
        intro: pickupAtEvent
          ? "vielen Dank für Deine Bestellung! Du hast Abholung beim nächsten EPHIA Community Event gewählt, Du musst also nichts weiter tun, wir bringen Deine Bestellung mit."
          : "vielen Dank für Deine Bestellung! Wir haben sie erhalten und schicken sie in den nächsten 3 bis 7 Werktagen auf den Weg zu Dir.",
        infoRows: [
          {
            label: "Produkt",
            value: `${productTitle}${variantLabel ? ` (${variantLabel})` : ""}${quantity > 1 ? ` × ${quantity}` : ""}`,
          },
          { label: "Artikel", value: fmt(itemGrossCents) },
          pickupAtEvent
            ? { label: "Lieferart", value: "Abholung beim Community Event" }
            : { label: "Versand", value: fmt(shippingGrossCents) },
          ...(discountCents > 0
            ? [{ label: "Rabatt", value: `−${fmt(discountCents)}` }]
            : []),
          { label: "Gesamt", value: fmt(amountPaidCents) },
        ],
        extraContent: `
          <p style="margin:0 0 20px;font-size:14px;line-height:1.5;">
            Deine Rechnung bekommst Du in einer separaten E-Mail. Falls Du per
            SEPA-Lastschrift bezahlt hast, kann das ein paar Tage dauern, bis
            die Zahlung bestätigt ist. Erst danach geht die Rechnung raus.
          </p>
        `,
      });

      await sendEmail(email, `Deine EPHIA-Bestellung: ${productTitle}`, html);
    } catch (err) {
      console.error("Merch confirmation email failed:", err);
    }
  }

  console.log(`Merch order created: ${order?.id} (${productTitle} / ${variantName})`);
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;
  if (!paymentIntentId) {
    console.log("charge.refunded without payment_intent — skipping");
    return;
  }

  // Find the checkout session that used this payment intent, then locate the
  // matching course_booking by stripe_checkout_session_id.
  const sessions = await stripe.checkout.sessions.list({
    payment_intent: paymentIntentId,
    limit: 1,
  });
  const sessionId = sessions.data[0]?.id;
  if (!sessionId) {
    console.log(`No checkout session found for payment_intent ${paymentIntentId}`);
    return;
  }

  const supabase = createAdminClient();
  const { data: booking, error: lookupErr } = await supabase
    .from("course_bookings")
    .select("id, status")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (lookupErr) {
    console.error("Failed to look up booking for refund:", lookupErr);
    return;
  }
  if (!booking) {
    console.log(`No course_booking found for session ${sessionId}`);
    return;
  }

  const { error: updateErr } = await supabase
    .from("course_bookings")
    .update({ status: "refunded" })
    .eq("id", booking.id);

  if (updateErr) {
    console.error("Failed to mark booking as refunded:", updateErr);
    return;
  }

  console.log(`Course booking ${booking.id} marked as refunded (was ${booking.status})`);
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
    } else if (event.type === "charge.refunded") {
      await handleChargeRefunded(event.data.object as Stripe.Charge);
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
    // Return 500 so Stripe retries the webhook (up to ~16 attempts over 3 days)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook processing failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
