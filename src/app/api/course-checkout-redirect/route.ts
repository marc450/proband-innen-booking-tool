import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;

async function stripePost(endpoint: string, body: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Stripe error: ${errText}`);
  }
  return res.json();
}

// GET /api/course-checkout-redirect?courseKey=xxx
// Creates a Stripe checkout for the Onlinekurs and redirects immediately.
// Designed for external button links (e.g. LearnWorlds iframes).
export async function GET(req: NextRequest) {
  try {
    const courseKey = req.nextUrl.searchParams.get("courseKey");
    if (!courseKey) {
      return NextResponse.json({ error: "courseKey required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: template } = await supabase
      .from("course_templates")
      .select("*")
      .eq("course_key", courseKey)
      .eq("status", "live")
      .single();

    if (!template) {
      return NextResponse.json({ error: "Kurs nicht gefunden" }, { status: 404 });
    }

    const isDentist = courseKey === "grundkurs_botulinum_zahnmedizin";
    const productName = isDentist
      ? `${template.name_online || template.title} (Zahnmedizin)`
      : template.name_online || template.title;
    const description = template.description_online || "";
    const grossPrice = template.price_gross_online || 0;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proband-innen.ephia.de";
    const successUrl = `${baseUrl}/courses/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = "https://www.ephia.de";

    const unitAmount = Math.round(grossPrice * 100);
    if (unitAmount <= 0) {
      return NextResponse.json({ error: "Preis nicht konfiguriert" }, { status: 500 });
    }

    const params: Record<string, string> = {
      mode: "payment",
      customer_creation: "always",
      success_url: successUrl,
      cancel_url: cancelUrl,
      locale: "de",
      billing_address_collection: "required",
      "phone_number_collection[enabled]": "true",
      allow_promotion_codes: "true",
      "automatic_tax[enabled]": "true",
      "tax_id_collection[enabled]": "true",
      "consent_collection[terms_of_service]": "required",
      "invoice_creation[enabled]": "true",

      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "eur",
      "line_items[0][price_data][unit_amount]": String(unitAmount),
      "line_items[0][price_data][product_data][name]": productName,
      "line_items[0][price_data][product_data][description]": description,

      "metadata[courseKey]": courseKey,
      "metadata[courseType]": "Onlinekurs",
      "metadata[templateId]": template.id,
      "metadata[sessionId]": "",
      "metadata[sessionLabel]": "",
      "metadata[sessionDateISO]": "",
      "metadata[audienceTag]": courseKey === "grundkurs_botulinum_zahnmedizin" ? "Zahnmediziner:in" : "Humanmediziner:in",
    };

    const session = await stripePost("/checkout/sessions", params);

    if (!session.url) {
      return NextResponse.json({ error: "Keine Checkout-URL erhalten" }, { status: 500 });
    }

    return NextResponse.redirect(session.url);
  } catch (err) {
    console.error("Course checkout redirect error:", err);
    return NextResponse.json({ error: "Ein Fehler ist aufgetreten" }, { status: 500 });
  }
}
