import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CURRICULA } from "@/lib/curricula";
import { randomUUID } from "crypto";

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
    const { slug, sessions } = (await req.json()) as {
      slug: string;
      sessions: Record<string, string>; // courseKey → sessionId
    };

    if (!slug) {
      return NextResponse.json({ error: "slug required" }, { status: 400 });
    }

    const curriculum = CURRICULA[slug];
    if (!curriculum) {
      return NextResponse.json({ error: "Curriculum nicht gefunden" }, { status: 404 });
    }

    const supabase = createAdminClient();
    const courseKeys = curriculum.courses.map((c) => c.courseKey);

    // Load all templates
    const { data: templates, error: tmplErr } = await supabase
      .from("course_templates")
      .select("*")
      .in("course_key", courseKeys)
      .eq("status", "live");

    if (tmplErr || !templates || templates.length !== courseKeys.length) {
      const missing = courseKeys.filter(
        (key) => !templates?.some((t: { course_key: string }) => t.course_key === key)
      );
      return NextResponse.json(
        { error: `Kurse nicht verfügbar: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate all sessions
    const sessionEntries: { courseKey: string; sessionId: string; templateId: string; label: string; dateISO: string }[] = [];

    for (const course of curriculum.courses) {
      const template = templates.find((t: { course_key: string }) => t.course_key === course.courseKey);
      if (!template) continue;

      const sessionId = sessions[course.courseKey];
      if (!sessionId) {
        return NextResponse.json(
          { error: `Bitte wähle einen Termin für ${template.name_kombi || template.title}` },
          { status: 400 }
        );
      }

      const { data: session } = await supabase
        .from("course_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("is_live", true)
        .single();

      if (!session) {
        return NextResponse.json(
          { error: `Termin für ${template.name_kombi || template.title} nicht verfügbar` },
          { status: 400 }
        );
      }

      if (session.booked_seats >= session.max_seats) {
        return NextResponse.json(
          { error: `Termin für ${template.name_kombi || template.title} ist leider ausgebucht` },
          { status: 409 }
        );
      }

      sessionEntries.push({
        courseKey: course.courseKey,
        sessionId: session.id,
        templateId: template.id,
        label: session.label_de || session.date_iso,
        dateISO: session.date_iso,
      });
    }

    // Calculate pricing
    let totalGross = 0;
    const courseNames: string[] = [];

    for (const template of templates) {
      const price = template.price_gross_kombi;
      if (!price || price <= 0) {
        return NextResponse.json(
          { error: `Preis für ${template.name_kombi || template.title} nicht konfiguriert` },
          { status: 500 }
        );
      }
      totalGross += price;
      courseNames.push(template.name_kombi || template.title);
    }

    // Apply discount
    const discountedGross = totalGross * (1 - curriculum.discountPercent / 100);
    const unitAmount = Math.round(discountedGross * 100); // EUR to cents

    if (unitAmount <= 0) {
      return NextResponse.json({ error: "Preis nicht konfiguriert" }, { status: 500 });
    }

    // Generate bundle group ID
    const bundleGroupId = randomUUID();

    // Build description for Stripe
    const description = courseNames.join(" + ");

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://proband-innen-booking-tool-production-1269.up.railway.app";
    const successUrl = `${baseUrl}/courses/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/courses/curriculum/${slug}`;

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
      "line_items[0][price_data][product_data][name]": `${curriculum.title} Komplettpaket`,
      "line_items[0][price_data][product_data][description]": description,

      // Metadata for webhook processing
      "metadata[curriculumSlug]": slug,
      "metadata[courseType]": curriculum.courseType,
      "metadata[bundleGroupId]": bundleGroupId,
      "metadata[templateIds]": JSON.stringify(
        sessionEntries.map((e) => e.templateId)
      ),
      "metadata[sessions]": JSON.stringify(
        Object.fromEntries(sessionEntries.map((e) => [e.courseKey, e.sessionId]))
      ),
      "metadata[sessionLabels]": JSON.stringify(
        Object.fromEntries(sessionEntries.map((e) => [e.courseKey, e.label]))
      ),
      "metadata[courseKeys]": JSON.stringify(courseKeys),
      "metadata[audienceTag]": "Humanmediziner:in",
    };

    const session = await stripePost("/checkout/sessions", params);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Curriculum checkout error:", err);
    return NextResponse.json(
      { error: "Ein Fehler ist aufgetreten" },
      { status: 500 }
    );
  }
}
