import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

// Intermediate payment page for Umbuchungsgebühr. The email link points here
// instead of directly to a Stripe Checkout URL, so the link never expires.
// Each visit generates a fresh Stripe session (24h Stripe limit is reset) and
// updates the DB so the webhook can still match on stripe_checkout_session_id.

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const SITE_URL = "https://proband-innen.ephia.de";
const MARKETING_URL = "https://ephia.de";

async function stripePost(endpoint: string, body: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Stripe error: ${await res.text()}`);
  return res.json() as Promise<{ id: string; url: string }>;
}

export default async function UmbuchungBezahlenPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const admin = createAdminClient();

  // Fetch the request and the booking in one query.
  const { data: request } = await admin
    .from("course_rebooking_requests")
    .select(
      "id, status, fee_cents, booking_id, course_bookings(first_name, last_name, email, stripe_customer_id, course_templates(course_label_de, title))",
    )
    .eq("id", requestId)
    .single();

  if (!request || request.status !== "pending") {
    // Already paid or cancelled — show a simple message page.
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-5">
        <div className="max-w-md text-center">
          <img src="/logo.svg" alt="EPHIA" className="mx-auto mb-8" style={{ width: 180 }} />
          <h1 className="text-xl font-bold mb-3">
            {request?.status === "applied"
              ? "Umbuchung bereits abgeschlossen"
              : "Link nicht mehr gültig"}
          </h1>
          <p className="text-black/60 text-sm">
            {request?.status === "applied"
              ? "Deine Umbuchungsgebühr wurde bereits bezahlt und der neue Termin ist bestätigt."
              : "Dieser Zahlungslink ist nicht mehr aktiv. Bitte wende Dich an unser Team unter customerlove@ephia.de."}
          </p>
        </div>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const booking = request.course_bookings as any as {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    stripe_customer_id: string | null;
    course_templates: { course_label_de?: string; title?: string } | null;
  } | null;

  if (!booking?.email) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-5">
        <div className="max-w-md text-center">
          <img src="/logo.svg" alt="EPHIA" className="mx-auto mb-8" style={{ width: 180 }} />
          <p className="text-black/60 text-sm">
            Dieser Link ist ungültig. Bitte wende Dich an customerlove@ephia.de.
          </p>
        </div>
      </div>
    );
  }

  const courseName =
    booking.course_templates?.course_label_de ||
    booking.course_templates?.title ||
    "EPHIA Kurs";

  // Create a fresh Stripe Checkout session. The previous session id (if any) is
  // overwritten in the DB so the webhook always resolves the latest one.
  let checkoutUrl: string;
  try {
    const params: Record<string, string> = {
      mode: "payment",
      success_url: MARKETING_URL,
      cancel_url: `${SITE_URL}/umbuchung/bezahlen/${request.id}`,
      locale: "de",
      billing_address_collection: "required",
      "automatic_tax[enabled]": "true",
      "tax_id_collection[enabled]": "true",
      "invoice_creation[enabled]": "true",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "eur",
      "line_items[0][price_data][unit_amount]": String(request.fee_cents),
      "line_items[0][price_data][product_data][name]": `Umbuchungsgebühr: ${courseName}`,
      "line_items[0][price_data][product_data][description]":
        "Einmalige Umbuchungsgebühr für die Verlegung auf einen neuen Termin (AGB Ziffer 6).",
      "metadata[rebookingRequestId]": request.id,
    };
    if (booking.stripe_customer_id) {
      params.customer = booking.stripe_customer_id;
    } else {
      params.customer_creation = "always";
      params.customer_email = booking.email;
    }

    const checkout = await stripePost("/checkout/sessions", params);
    checkoutUrl = checkout.url;

    // Store the new session id so the Stripe webhook can resolve this request.
    await admin
      .from("course_rebooking_requests")
      .update({ stripe_checkout_session_id: checkout.id })
      .eq("id", request.id);
  } catch (err) {
    console.error("Umbuchung Stripe checkout error:", err);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-5">
        <div className="max-w-md text-center">
          <img src="/logo.svg" alt="EPHIA" className="mx-auto mb-8" style={{ width: 180 }} />
          <h1 className="text-xl font-bold mb-3">Zahlung konnte nicht gestartet werden</h1>
          <p className="text-black/60 text-sm">
            Bitte versuche es erneut oder wende Dich an customerlove@ephia.de.
          </p>
        </div>
      </div>
    );
  }

  redirect(checkoutUrl);
}
