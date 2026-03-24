import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

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

    // Fetch the payment method to get billing_details — cards store the billing
    // address there, which is more reliable than customer_details.address in setup mode
    let pmBillingAddress: Record<string, string> = {};
    if (paymentMethodId) {
      const pm = await stripeGet(`/payment_methods/${paymentMethodId}`);
      console.log("payment_method billing_details:", JSON.stringify(pm.billing_details));
      pmBillingAddress = pm.billing_details?.address || {};
    }

    // Prefer payment method billing address; fall back to session customer_details.address
    console.log("session.customer_details:", JSON.stringify(cd));
    const sessionAddress = cd.address || {};
    const address: Record<string, string> = {
      line1: pmBillingAddress.line1 || sessionAddress.line1 || "",
      postal_code: pmBillingAddress.postal_code || sessionAddress.postal_code || "",
      city: pmBillingAddress.city || sessionAddress.city || "",
      country: pmBillingAddress.country || sessionAddress.country || "",
    };
    console.log("resolved address:", JSON.stringify(address));

    // Create a Stripe customer from the collected checkout data so we can:
    // (a) attach the payment method for future off-session charges (no-show fee)
    // (b) save a real customer ID to the patient record
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
      console.log("created customer:", customer.id, "error:", customer.error);
      if (customer.id) {
        customerId = customer.id;
      }
    }

    // Attach payment method to customer and set as default for invoices
    if (customerId && paymentMethodId) {
      await stripePost(`/payment_methods/${paymentMethodId}/attach`, {
        customer: customerId,
      });
      await stripePost(`/customers/${customerId}`, {
        "invoice_settings[default_payment_method]": paymentMethodId,
      });
    }

    // Hard block: reject booking if patient is blacklisted (check by email and phone)
    const normalizePhone = (p: string) => p.replace(/\D/g, "");

    if (email) {
      const { data: byEmail } = await supabase
        .from("patients")
        .select("patient_status")
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();

      if (byEmail?.patient_status === "blacklist") {
        return new Response(
          JSON.stringify({ error: "Eine Buchung ist mit diesen Daten nicht möglich." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (phone) {
      const normalizedPhone = normalizePhone(phone);
      if (normalizedPhone.length >= 7) {
        const { data: blacklisted } = await supabase
          .from("patients")
          .select("phone")
          .eq("patient_status", "blacklist")
          .not("phone", "is", null);

        const phoneMatch = blacklisted?.find(
          (p) => p.phone && normalizePhone(p.phone) === normalizedPhone
        );

        if (phoneMatch) {
          return new Response(
            JSON.stringify({ error: "Eine Buchung ist mit diesen Daten nicht möglich." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Upsert patient profile (create or update by email)
    let patientId: string | null = null;
    if (email) {
      const { data: pid, error: patientErr } = await supabase.rpc("upsert_patient", {
        p_email: email,
        p_first_name: firstName || null,
        p_last_name: lastName || null,
        p_phone: phone || null,
        p_address_street: address.line1 || null,
        p_address_zip: address.postal_code || null,
        p_address_city: address.city || null,
        p_stripe_customer_id: customerId || null,
      });
      if (!patientErr && pid) {
        patientId = pid;
      } else {
        console.error("Patient upsert error:", patientErr);
      }
    }

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
      .select("start_time, courses(title, course_date)")
      .eq("id", slotId)
      .single();

    const courseTitle = slotInfo?.courses?.title || "Kurs";
    const courseDate = slotInfo?.courses?.course_date || "";
    const startTime = slotInfo?.start_time || "";

    // Format date and time for email
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
    } catch (_) { /* keep raw values */ }

    // Send confirmation email via Resend
    if (email && RESEND_API_KEY) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "EPHIA <customerlove@ephia.de>",
            to: [email],
            subject: `Buchungsbestaetigung: ${courseTitle}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="text-align: center; margin-bottom: 32px;">
                  <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0;">EPHIA</h1>
                </div>
                <div style="background: #ffffff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 32px;">
                  <h2 style="font-size: 20px; color: #1a1a1a; margin: 0 0 8px 0;">Hallo ${firstName}!</h2>
                  <p style="color: #525252; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    Deine Buchung wurde erfolgreich bestaetigt. Hier sind Deine Details:
                  </p>
                  <div style="background: #fafafa; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #737373; font-size: 14px;">Kurs</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 600; text-align: right;">${courseTitle}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #737373; font-size: 14px;">Datum</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 600; text-align: right;">${formattedDate}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #737373; font-size: 14px;">Uhrzeit</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 600; text-align: right;">${formattedTime}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #737373; font-size: 14px;">Name</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 600; text-align: right;">${fullName}</td>
                      </tr>
                    </table>
                  </div>
                  <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                    <p style="color: #9a3412; font-size: 14px; line-height: 1.5; margin: 0;">
                      <strong>Wichtiger Hinweis:</strong> Bei Nichterscheinen oder Absage weniger als 24 Stunden vor dem Termin wird eine Gebuehr von 50 EUR erhoben.
                    </p>
                  </div>
                  <p style="color: #525252; font-size: 14px; line-height: 1.6; margin: 0;">
                    Wir freuen uns auf Dich!<br>
                    Dein EPHIA Team
                  </p>
                </div>
                <div style="text-align: center; margin-top: 24px;">
                  <p style="color: #a3a3a3; font-size: 12px; margin: 0;">EPHIA Medical GmbH</p>
                </div>
              </div>
            `,
          }),
        });
      } catch (emailErr) {
        // Don't fail the booking if email fails
        console.error("Failed to send confirmation email:", emailErr);
      }
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
