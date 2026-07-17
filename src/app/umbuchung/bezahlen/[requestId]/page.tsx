import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

// Intermediate payment page for Umbuchungsgebühr. The email link points here
// instead of directly to a Stripe Checkout URL, so the link never expires.
// Each visit generates a fresh Stripe session (24h Stripe limit is reset) and
// updates the DB so the webhook can still match on stripe_checkout_session_id.

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const SITE_URL = "https://proband-innen.ephia.de";
const MARKETING_URL = "https://ephia.de";

/** Has the seat hold for this request run out? Module scope on purpose: the
 *  page is a server component and re-reads the clock on every request, which
 *  the react-hooks purity rule flags inside a component body. */
function isLapsed(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

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
      "id, status, fee_cents, surcharge_cents, expires_at, booking_id, to_template:course_templates!to_template_id(course_label_de, title), course_bookings(first_name, last_name, email, stripe_customer_id, course_templates(course_label_de, title))",
    )
    .eq("id", requestId)
    .single();

  // The seat hold has a deadline (migration 154). Check it here as well as in
  // the reaper: that only sweeps once a day, so a link goes stale well before
  // the row does, and we must not take a fee for a seat we owe back. This check
  // is what actually enforces the deadline for the doctor.
  const holdLapsed = isLapsed((request?.expires_at as string | null) ?? null);

  if (!request || request.status !== "pending" || holdLapsed) {
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
              : holdLapsed
                ? "Der Platz im neuen Termin war bis zu einem festen Datum für Dich reserviert, diese Frist ist abgelaufen. Es bleibt bei Deinem ursprünglichen Termin. Wenn Du weiterhin umbuchen möchtest, melde Dich gerne unter customerlove@ephia.de."
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toTemplate = (request as any).to_template as
    | { course_label_de?: string; title?: string }
    | null;
  const currentCourseName =
    booking.course_templates?.course_label_de ||
    booking.course_templates?.title ||
    "EPHIA Kurs";
  // For a cross-course move the fee + Aufpreis reference the TARGET course.
  const courseName =
    toTemplate?.course_label_de || toTemplate?.title || currentCourseName;
  const surchargeCents: number = (request as { surcharge_cents?: number }).surcharge_cents || 0;

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
      "metadata[rebookingRequestId]": request.id,
    };

    // Line items: the Umbuchungsgebühr (may be 0 € for a cross-course move more
    // than 14 days out) and, for a cross-course upgrade, the Kursaufpreis. At
    // least one of the two is always positive (the API only creates a request
    // that reaches this page when fee + surcharge > 0).
    let li = 0;
    if (request.fee_cents > 0) {
      params[`line_items[${li}][quantity]`] = "1";
      params[`line_items[${li}][price_data][currency]`] = "eur";
      params[`line_items[${li}][price_data][unit_amount]`] = String(request.fee_cents);
      params[`line_items[${li}][price_data][product_data][name]`] =
        `Umbuchungsgebühr: ${courseName}`;
      params[`line_items[${li}][price_data][product_data][description]`] =
        "Einmalige Umbuchungsgebühr für die Verlegung auf einen neuen Termin (AGB Ziffer 6).";
      li++;
    }
    if (surchargeCents > 0) {
      params[`line_items[${li}][quantity]`] = "1";
      params[`line_items[${li}][price_data][currency]`] = "eur";
      params[`line_items[${li}][price_data][unit_amount]`] = String(surchargeCents);
      params[`line_items[${li}][price_data][product_data][name]`] =
        `Kursaufpreis: ${courseName}`;
      params[`line_items[${li}][price_data][product_data][description]`] =
        "Preisdifferenz zum höherwertigen Kurs bei der Umbuchung.";
      li++;
    }
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
