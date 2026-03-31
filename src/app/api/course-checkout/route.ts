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

export async function POST(req: NextRequest) {
  try {
    const { courseKey, courseType, sessionId } = await req.json();

    if (!courseKey || !courseType) {
      return NextResponse.json({ error: "courseKey and courseType required" }, { status: 400 });
    }

    if (!["Onlinekurs", "Praxiskurs", "Kombikurs", "Premium"].includes(courseType)) {
      return NextResponse.json({ error: "Invalid courseType" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Load course template
    const { data: template } = await supabase
      .from("course_templates")
      .select("*")
      .eq("course_key", courseKey)
      .eq("status", "live")
      .single();

    if (!template) {
      return NextResponse.json({ error: "Kurs nicht gefunden" }, { status: 404 });
    }

    const isOnline = courseType === "Onlinekurs";
    const isPraxis = courseType === "Praxiskurs";
    const isPremium = courseType === "Premium";

    // For Praxiskurs/Kombikurs/Premium: validate session
    let sessionLabel = "";
    let sessionDateISO = "";
    if (!isOnline) {
      if (!sessionId) {
        return NextResponse.json({ error: "sessionId ist erforderlich" }, { status: 400 });
      }

      const { data: session } = await supabase
        .from("course_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("is_live", true)
        .single();

      if (!session) {
        return NextResponse.json({ error: "Termin nicht verfügbar" }, { status: 400 });
      }

      if (session.booked_seats >= session.max_seats) {
        return NextResponse.json({ error: "Dieser Termin ist leider ausgebucht" }, { status: 409 });
      }

      sessionLabel = session.label_de || session.date_iso;
      sessionDateISO = session.date_iso;
    }

    // Select per-type fields
    let productName: string;
    let description: string;
    let grossPrice: number;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proband-innen-booking-tool-production-1269.up.railway.app";
    const successUrl = `${baseUrl}/courses/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = "https://www.ephia.de";

    if (isOnline) {
      productName = template.name_online || template.title;
      description = template.description_online || "";
      grossPrice = template.price_gross_online || 0;
    } else if (isPraxis) {
      productName = `${template.name_praxis || template.title} – ${sessionLabel}`;
      description = template.description_praxis || "";
      grossPrice = template.price_gross_praxis || 0;
    } else if (isPremium) {
      // Komplettpaket: hardcoded 10% discount on EUR 2.220
      productName = `Komplettpaket – ${sessionLabel}`;
      description = "4 Onlinekurse + Praxiskurs Botulinum";
      grossPrice = 2220;
    } else {
      // Kombikurs
      productName = `${template.name_kombi || template.title} – ${sessionLabel}`;
      description = template.description_kombi || "";
      grossPrice = template.price_gross_kombi || 0;
    }

    let unitAmount = Math.round(grossPrice * 100); // EUR to cents

    // Premium: apply 10% discount
    if (isPremium) {
      unitAmount = Math.round(unitAmount * 0.9);
    }

    if (unitAmount <= 0) {
      return NextResponse.json({ error: "Preis nicht konfiguriert" }, { status: 500 });
    }

    // Build Stripe checkout params
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

      // Line item
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "eur",
      "line_items[0][price_data][unit_amount]": String(unitAmount),
      "line_items[0][price_data][product_data][name]": productName,
      "line_items[0][price_data][product_data][description]": description,

      // Metadata for webhook processing
      "metadata[courseKey]": courseKey,
      "metadata[courseType]": courseType,
      "metadata[templateId]": template.id,
      "metadata[sessionId]": sessionId || "",
      "metadata[sessionLabel]": sessionLabel,
      "metadata[sessionDateISO]": sessionDateISO,
      "metadata[audienceTag]": courseKey === "grundkurs_botulinum_zahnmedizin" ? "Zahnmediziner:in" : "Humanmediziner:in",
    };

    const session = await stripePost("/checkout/sessions", params);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Course checkout error:", err);
    return NextResponse.json(
      { error: "Ein Fehler ist aufgetreten" },
      { status: 500 }
    );
  }
}
