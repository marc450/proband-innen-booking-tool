import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildCourseLineItem, type CourseVariant } from "@/lib/course-pricing";

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

/**
 * Combined checkout for a MULTI-course invite. The doctor pays for every
 * course attached to the invite in one Stripe session (one line item per
 * course). The webhook re-reads the invite and creates one booking per
 * course via create_course_bookings_with_invite.
 *
 * Single-course invites do NOT use this route, they go through
 * /api/course-checkout exactly as before.
 */
export async function POST(req: NextRequest) {
  try {
    const { inviteToken } = await req.json();
    if (!inviteToken) {
      return NextResponse.json({ error: "inviteToken ist erforderlich." }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: invite } = await supabase
      .from("booking_invites")
      .select(
        "id, stripe_promotion_code_id, recipient_email, expires_at, revoked, used_count, max_uses, booking_invite_courses(template_id, session_id, course_type, sort_order)",
      )
      .eq("token", inviteToken)
      .maybeSingle();

    if (!invite) {
      return NextResponse.json({ error: "Einladung ist ungültig." }, { status: 404 });
    }
    if (invite.revoked) {
      return NextResponse.json({ error: "Einladung wurde widerrufen." }, { status: 410 });
    }
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: "Einladung ist abgelaufen." }, { status: 410 });
    }
    if (invite.used_count >= invite.max_uses) {
      return NextResponse.json({ error: "Einladung wurde bereits eingelöst." }, { status: 410 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const courseRows = ((invite.booking_invite_courses as any[]) || [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    if (courseRows.length === 0) {
      return NextResponse.json(
        { error: "Diese Einladung enthält keine Kurse." },
        { status: 400 },
      );
    }

    // Load every template referenced by the invite in one query.
    const templateIds = Array.from(new Set(courseRows.map((c) => c.template_id)));
    const { data: templates } = await supabase
      .from("course_templates")
      .select("*")
      .in("id", templateIds);
    const templateById = new Map((templates || []).map((t) => [t.id, t]));

    // Load session labels for the line-item names. Invited seats bypass
    // capacity, so we don't enforce is_live / sold-out here.
    const sessionIds = courseRows
      .map((c) => c.session_id)
      .filter((id): id is string => !!id);
    const { data: sessions } = sessionIds.length
      ? await supabase
          .from("course_sessions")
          .select("id, label_de, date_iso")
          .in("id", sessionIds)
      : { data: [] };
    const sessionById = new Map((sessions || []).map((s) => [s.id, s]));

    // Build one Stripe line item per course.
    const params: Record<string, string> = {
      mode: "payment",
      customer_creation: "always",
      success_url:
        "https://ephia.de/courses/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://ephia.de",
      locale: "de",
      billing_address_collection: "required",
      "phone_number_collection[enabled]": "true",
      allow_promotion_codes: "true",
      "automatic_tax[enabled]": "true",
      "tax_id_collection[enabled]": "true",
      "consent_collection[terms_of_service]": "required",
      "invoice_creation[enabled]": "true",

      "metadata[inviteToken]": inviteToken,
      "metadata[inviteMulti]": "1",
    };

    let lineIndex = 0;
    for (const course of courseRows) {
      const template = templateById.get(course.template_id);
      if (!template) {
        return NextResponse.json(
          { error: "Ein Kurs dieser Einladung ist nicht mehr verfügbar." },
          { status: 400 },
        );
      }
      const sess = course.session_id ? sessionById.get(course.session_id) : null;
      const sessionLabel = sess?.label_de || sess?.date_iso || "";

      const { productName, description, grossPriceCents } = buildCourseLineItem({
        template,
        courseKey: template.course_key,
        courseType: course.course_type as CourseVariant,
        sessionLabel,
      });

      if (grossPriceCents <= 0) {
        return NextResponse.json(
          { error: `Preis für ${productName || "einen Kurs"} ist nicht konfiguriert.` },
          { status: 500 },
        );
      }

      const i = lineIndex++;
      params[`line_items[${i}][quantity]`] = "1";
      params[`line_items[${i}][price_data][currency]`] = "eur";
      params[`line_items[${i}][price_data][unit_amount]`] = String(grossPriceCents);
      params[`line_items[${i}][price_data][product_data][name]`] = productName;
      if (description) {
        params[`line_items[${i}][price_data][product_data][description]`] = description;
      }
    }

    // Apply the invite's stored promotion code to the whole cart. Stripe
    // rejects `discounts` together with `allow_promotion_codes: true`.
    if (invite.stripe_promotion_code_id) {
      params["discounts[0][promotion_code]"] = invite.stripe_promotion_code_id;
      delete params.allow_promotion_codes;
    }
    if (invite.recipient_email) {
      params.customer_email = invite.recipient_email;
    }

    const session = await stripePost("/checkout/sessions", params);
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Einladung checkout error:", err);
    return NextResponse.json({ error: "Ein Fehler ist aufgetreten" }, { status: 500 });
  }
}
