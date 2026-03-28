import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const ENCRYPTION_PUBLIC_KEY_PEM = process.env.ENCRYPTION_PUBLIC_KEY!.replace(/\\n/g, "\n");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- Encryption helpers (Node.js crypto) ---

function encryptFields(fields: Record<string, unknown>): {
  encrypted_data: string;
  encrypted_key: string;
  encryption_iv: string;
} {
  const plaintext = JSON.stringify(fields);

  // Generate AES-256-GCM key (DEK) and IV
  const dek = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);

  // Encrypt data with AES-256-GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", dek, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const ciphertext = Buffer.concat([encrypted, authTag]);

  // Encrypt DEK with RSA-OAEP
  const encryptedDek = crypto.publicEncrypt(
    { key: ENCRYPTION_PUBLIC_KEY_PEM, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" },
    dek
  );

  return {
    encrypted_data: ciphertext.toString("base64"),
    encrypted_key: encryptedDek.toString("base64"),
    encryption_iv: iv.toString("base64"),
  };
}

function hashSha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function hashEmail(email: string): string {
  return hashSha256(email.toLowerCase().trim());
}

function hashPhone(phone: string): string {
  return hashSha256(phone.replace(/\D/g, ""));
}

// --- Stripe helpers ---

async function stripeGet(path: string) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
  });
  return res.json();
}

async function stripePost(path: string, body: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
  });
  return res.json();
}

// --- Main handler ---

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    // Check if this session was already used to create a booking
    const { data: existingSession } = await supabase
      .from("bookings")
      .select("id")
      .eq("stripe_checkout_session_id", sessionId)
      .maybeSingle();

    if (existingSession) {
      return NextResponse.json({ booking: existingSession, alreadyExists: true });
    }

    // Retrieve Checkout Session via REST API
    const session = await stripeGet(`/checkout/sessions/${sessionId}`);

    if (session.status !== "complete") {
      return NextResponse.json({ error: "Checkout session is not complete" }, { status: 400 });
    }

    const setupIntentId = session.setup_intent;
    if (!setupIntentId) {
      return NextResponse.json({ error: "No setup intent found" }, { status: 400 });
    }

    const setupIntent = await stripeGet(`/setup_intents/${setupIntentId}`);

    if (setupIntent.status !== "succeeded") {
      return NextResponse.json({ error: "Payment method not confirmed" }, { status: 400 });
    }

    const paymentMethodId = setupIntent.payment_method;
    const slotId = session.metadata?.slotId;

    if (!slotId) {
      return NextResponse.json({ error: "Missing slotId in session metadata" }, { status: 400 });
    }

    // Get customer details from session
    const cd = session.customer_details || {};
    const email: string = cd.email || "";
    const phone: string = session.metadata?.phone || cd.phone || "";
    const fullName: string = cd.name || "";
    const nameParts = fullName.split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Fetch billing address from payment method
    let pmBillingAddress: Record<string, string> = {};
    if (paymentMethodId) {
      const pm = await stripeGet(`/payment_methods/${paymentMethodId}`);
      pmBillingAddress = pm.billing_details?.address || {};
    }

    const sessionAddress = cd.address || {};
    const address: Record<string, string> = {
      line1: pmBillingAddress.line1 || sessionAddress.line1 || "",
      postal_code: pmBillingAddress.postal_code || sessionAddress.postal_code || "",
      city: pmBillingAddress.city || sessionAddress.city || "",
      country: pmBillingAddress.country || sessionAddress.country || "",
    };

    // Create Stripe customer
    let customerId: string | null = setupIntent.customer || null;
    if (!customerId && email) {
      const customerParams: Record<string, string> = { email };
      if (fullName) customerParams["name"] = fullName;
      if (phone) customerParams["phone"] = phone;
      if (address.line1) customerParams["address[line1]"] = address.line1;
      if (address.postal_code) customerParams["address[postal_code]"] = address.postal_code;
      if (address.city) customerParams["address[city]"] = address.city;
      if (address.country) customerParams["address[country]"] = address.country;

      const customer = await stripePost("/customers", customerParams);
      if (customer.id) customerId = customer.id;
    }

    // Attach payment method to customer
    if (customerId && paymentMethodId) {
      await stripePost(`/payment_methods/${paymentMethodId}/attach`, { customer: customerId });
      await stripePost(`/customers/${customerId}`, {
        "invoice_settings[default_payment_method]": paymentMethodId,
      });
    }

    // Compute hashes for lookups
    const emailHash = email ? hashEmail(email) : null;
    const phoneHash = phone ? hashPhone(phone) : null;

    // Blacklist check by email hash
    if (emailHash) {
      const { data: byEmail } = await supabase
        .from("patients")
        .select("patient_status")
        .eq("email_hash", emailHash)
        .maybeSingle();

      if (byEmail?.patient_status === "blacklist") {
        return NextResponse.json({ error: "Eine Buchung ist mit diesen Daten nicht möglich." }, { status: 403 });
      }
    }

    // Blacklist check by phone hash
    if (phoneHash) {
      const { data: byPhone } = await supabase
        .from("patients")
        .select("patient_status")
        .eq("phone_hash", phoneHash)
        .eq("patient_status", "blacklist")
        .maybeSingle();

      if (byPhone) {
        return NextResponse.json({ error: "Eine Buchung ist mit diesen Daten nicht möglich." }, { status: 403 });
      }
    }

    // Same-course duplicate check by email hash
    if (emailHash) {
      const { data: slotRow } = await supabase
        .from("slots")
        .select("course_id")
        .eq("id", slotId)
        .single();

      const { data: courseSlots } = await supabase
        .from("slots")
        .select("id")
        .eq("course_id", slotRow?.course_id ?? "");

      const slotIds = (courseSlots ?? []).map((s: { id: string }) => s.id);

      if (slotIds.length > 0) {
        const { data: existingCourseBooking } = await supabase
          .from("bookings")
          .select("id")
          .eq("email_hash", emailHash)
          .in("slot_id", slotIds)
          .in("status", ["booked", "attended"])
          .maybeSingle();

        if (existingCourseBooking) {
          return NextResponse.json({ error: "Du hast für diesen Kurs bereits einen Termin gebucht." }, { status: 409 });
        }
      }
    }

    // Encrypt patient data
    const patientEncrypted = encryptFields({
      email,
      first_name: firstName || null,
      last_name: lastName || null,
      phone: phone || null,
      address_street: address.line1 || null,
      address_zip: address.postal_code || null,
      address_city: address.city || null,
      stripe_customer_id: customerId || null,
      notes: null,
    });

    // Upsert patient by email_hash
    let patientId: string | null = null;
    if (emailHash) {
      const { data: existingPatient } = await supabase
        .from("patients")
        .select("id")
        .eq("email_hash", emailHash)
        .maybeSingle();

      if (existingPatient) {
        patientId = existingPatient.id;
        await supabase
          .from("patients")
          .update({
            encrypted_data: patientEncrypted.encrypted_data,
            encrypted_key: patientEncrypted.encrypted_key,
            encryption_iv: patientEncrypted.encryption_iv,
            phone_hash: phoneHash,
          })
          .eq("id", patientId);
      } else {
        const { data: newPatient } = await supabase
          .from("patients")
          .insert({
            email_hash: emailHash,
            phone_hash: phoneHash,
            patient_status: "active",
            encrypted_data: patientEncrypted.encrypted_data,
            encrypted_key: patientEncrypted.encrypted_key,
            encryption_iv: patientEncrypted.encryption_iv,
          })
          .select("id")
          .single();
        patientId = newPatient?.id ?? null;
      }
    }

    // Encrypt booking data
    const bookingEncrypted = encryptFields({
      name: fullName,
      first_name: firstName,
      last_name: lastName,
      email,
      phone: phone || null,
      address_street: address.line1 || null,
      address_zip: address.postal_code || null,
      address_city: address.city || null,
      stripe_customer_id: customerId,
      stripe_payment_method_id: paymentMethodId,
    });

    // Create booking using RPC for atomic slot locking
    const { data: bookingId, error: rpcError } = await supabase.rpc("create_encrypted_booking", {
      p_slot_id: slotId,
      p_email_hash: emailHash,
      p_encrypted_data: bookingEncrypted.encrypted_data,
      p_encrypted_key: bookingEncrypted.encrypted_key,
      p_encryption_iv: bookingEncrypted.encryption_iv,
      p_stripe_checkout_session_id: sessionId,
    });

    if (rpcError) {
      console.error("Booking RPC error:", rpcError);
      const msg = rpcError.message || "";
      if (msg.includes("SLOT_FULL")) {
        return NextResponse.json({ error: "Dieser Termin ist leider bereits ausgebucht." }, { status: 409 });
      }
      if (msg.includes("DUPLICATE_BOOKING")) {
        return NextResponse.json({ error: "Du hast bereits eine Buchung für diesen Termin." }, { status: 409 });
      }
      return NextResponse.json({ error: "Buchung konnte nicht erstellt werden." }, { status: 500 });
    }

    // Link booking to patient
    if (patientId && bookingId) {
      await supabase
        .from("bookings")
        .update({ patient_id: patientId })
        .eq("id", bookingId);
    }

    // Fetch slot + course details for the email
    const { data: slotInfo } = await supabase
      .from("slots")
      .select("start_time, courses(title, course_date, location)")
      .eq("id", slotId)
      .single();

    const courseInfo = slotInfo?.courses as { title?: string; course_date?: string; location?: string } | null;
    const courseTitle = courseInfo?.title || "Kurs";
    const courseDate = courseInfo?.course_date || "";
    const courseLocation = courseInfo?.location || "";
    const startTime = slotInfo?.start_time || "";

    let formattedDate = courseDate;
    let formattedTime = "";
    try {
      if (courseDate) {
        formattedDate = new Date(courseDate).toLocaleDateString("de-DE", {
          weekday: "long", day: "numeric", month: "long", year: "numeric"
        });
      }
      if (startTime) {
        formattedTime = new Date(startTime).toLocaleTimeString("de-DE", {
          hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin"
        }) + " Uhr";
      }
    } catch { /* keep raw values */ }

    // Send confirmation email via Resend
    if (email && RESEND_API_KEY) {
      try {
        const logoUrl = "https://lwfiles.mycourse.app/6638baeec5c56514e03ec360-public/f64a1ea1eb5346a171fe9ea36e8615ca.png";
        const footer = `
          <div style="margin-top:24px; padding-top:16px; border-top:1px solid #f0f0f0; text-align:left;">
            <img src="${logoUrl}" alt="EPHIA" style="width:160px; height:auto; display:block; margin:0 0 8px;">
            <div style="color:#9e9e9e; font-size:12px; line-height:1.5;">
              EPHIA Medical GmbH<br>
              Dorfstraße 30, 15913 Märkische Heide, Deutschland<br>
              Geschäftsführerin: Dr. Sophia Wilk-Vollmann
            </div>
          </div>`;

        const infoRows = [
          { label: "Kurs", value: courseTitle },
          { label: "Datum", value: formattedDate },
          { label: "Uhrzeit", value: formattedTime },
          ...(courseLocation ? [{ label: "Ort", value: courseLocation }] : []),
        ].map(r => `<p style="margin:0 0 6px;"><span style="font-weight:bold;">${r.label}:</span> ${r.value}</p>`).join("");

        const html = `<div style="background-color:#fff; padding:0; font-family:Arial, sans-serif;">
  <div style="background-color:#fff; max-width:600px; margin:0 auto; padding:8px; text-align:left; line-height:1.5;">

    <p style="margin-top:0; margin-bottom:20px;">
      Hi ${firstName},<br><br>
      toll, dass Du Dich für den <strong>${courseTitle}</strong> bei EPHIA angemeldet hast!<br>
      Wir freuen uns sehr darauf, Dich bald bei uns zu sehen. Hier sind alle wichtigen Informationen zu Deinem Termin auf einen Blick:
    </p>

    <div style="border-radius:8px; padding:14px 16px; background-color:#FAEBE1; border:1px solid #F0D0B8; font-size:14px; margin:0 0 20px; text-align:left;">
      ${infoRows}
    </div>

    <div style="background-color:#FAEBE1; border:1px solid #F0D0B8; border-radius:8px; padding:14px 16px; margin:0 0 20px; font-size:14px; line-height:1.5;">
      <strong>Wichtiger Hinweis:</strong> Bei Nichterscheinen oder Absage weniger als 24 Stunden vor dem Termin wird eine Gebühr von 50 EUR erhoben.
    </div>

    <p style="margin:0 0 20px;">
      Wenn Du vor dem Termin noch Fragen hast, melde Dich jederzeit bei uns:
      <a href="mailto:customerlove@ephia.de" style="color:#0066FF; text-decoration:none;">customerlove@ephia.de</a>
    </p>

    <p style="margin:0 0 20px;">
      Herzliche Grüße,<br>
      Dein EPHIA-Team
    </p>

    ${footer}
  </div>
</div>`;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "EPHIA <customerlove@ephia.de>",
            to: [email],
            subject: `Buchungsbestätigung: ${courseTitle}`,
            html,
          }),
        });
      } catch (emailErr) {
        console.error("Failed to send confirmation email:", emailErr);
      }
    }

    return NextResponse.json({ booking: { id: bookingId } });
  } catch (err) {
    console.error("Error confirming booking:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ein Fehler ist aufgetreten" },
      { status: 500 }
    );
  }
}
