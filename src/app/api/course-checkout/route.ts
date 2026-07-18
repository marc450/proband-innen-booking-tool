import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  buildCourseLineItem,
  PRAXISKURS_OFFER_PRICE_CENTS,
  type CourseVariant,
} from "@/lib/course-pricing";

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
    const { courseKey, courseType, sessionId, inviteToken, praxisOffer, gaClientId, gaSessionId } =
      await req.json();

    if (!courseKey || !courseType) {
      return NextResponse.json({ error: "courseKey and courseType required" }, { status: 400 });
    }

    if (!["Onlinekurs", "Praxiskurs", "Kombikurs", "Premium"].includes(courseType)) {
      return NextResponse.json({ error: "Invalid courseType" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // When an invite token is attached, validate it up-front and use it
    // to bypass the "session full" guard below. The webhook re-validates
    // atomically via create_course_booking_with_invite, so this is only
    // a friendlier UX check (give the user a clear error BEFORE they
    // get bounced to Stripe).
    let invite: {
      id: string;
      template_id: string;
      session_id: string | null;
      course_type: string;
      stripe_promotion_code_id: string | null;
      recipient_email: string | null;
      expires_at: string | null;
      revoked: boolean;
      used_count: number;
      max_uses: number;
      rebooking_fee_cents: number | null;
    } | null = null;
    if (inviteToken) {
      const { data: inv } = await supabase
        .from("booking_invites")
        .select(
          "id, template_id, session_id, course_type, stripe_promotion_code_id, recipient_email, expires_at, revoked, used_count, max_uses, rebooking_fee_cents",
        )
        .eq("token", inviteToken)
        .maybeSingle();
      if (!inv) {
        return NextResponse.json({ error: "Einladung ist ungültig." }, { status: 404 });
      }
      if (inv.revoked) {
        return NextResponse.json({ error: "Einladung wurde widerrufen." }, { status: 410 });
      }
      if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
        return NextResponse.json({ error: "Einladung ist abgelaufen." }, { status: 410 });
      }
      if (inv.used_count >= inv.max_uses) {
        return NextResponse.json({ error: "Einladung wurde bereits eingelöst." }, { status: 410 });
      }
      if (inv.course_type !== courseType) {
        return NextResponse.json({ error: "Einladung passt nicht zur gewählten Kursvariante." }, { status: 400 });
      }
      invite = inv;
    }

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

      // Sold-out guard: only enforce when there is no invite, or when
      // the invite points at a different session. Invites explicitly
      // bypass capacity for the session they were issued for.
      const inviteMatchesSession =
        invite && invite.session_id && invite.session_id === sessionId;
      if (session.booked_seats >= session.max_seats && !inviteMatchesSession) {
        return NextResponse.json({ error: "Dieser Termin ist leider ausgebucht" }, { status: 409 });
      }

      // Extra safety: if the invite specifies a session, it must match
      // the one the client is trying to book.
      if (invite && invite.session_id && invite.session_id !== sessionId) {
        return NextResponse.json(
          { error: "Einladung ist für einen anderen Termin ausgestellt." },
          { status: 400 },
        );
      }

      sessionLabel = session.label_de || session.date_iso;
      sessionDateISO = session.date_iso;
    }

    // Doctor-facing post-purchase URLs live on ephia.de. Old links that
    // still point at proband-innen.ephia.de keep working via a 308 in
    // middleware.ts, but new Stripe redirects skip the redirect hop.
    const successUrl =
      "https://ephia.de/courses/success?session_id={CHECKOUT_SESSION_ID}";
    const cancelUrl = "https://ephia.de";

    // Product name, description and gross price all come from the shared
    // pricing helper so the funnel, the invite landing page and the webhook
    // agree on the amount. Premium already includes the 10% bundle discount.
    const lineItem = buildCourseLineItem({
      template,
      courseKey,
      courseType: courseType as CourseVariant,
      sessionLabel,
    });
    let productName = lineItem.productName;
    let description = lineItem.description;
    let unitAmount = lineItem.grossPriceCents;

    // Umbuchung: when the invite carries a flat rebooking fee, that fee is the
    // entire charge, independent of variant. Per AGB Ziffer 6 the doctor keeps
    // the already-paid course and only pays the Kulanz-Umbuchungsgebühr to move
    // to a new date, so the variant price and any promo code are ignored.
    const isRebooking = !!invite && invite.rebooking_fee_cents != null;
    if (isRebooking) {
      unitAmount = invite!.rebooking_fee_cents as number;
      productName = `Umbuchung: ${productName}`;
      description = "Einmalige Umbuchungsgebühr für die Verlegung auf einen neuen Termin (AGB Ziffer 6).";
    }

    // "Praxiskurs dazubuchen" from /mein-konto: a doctor who already owns
    // the Onlinekurs pays a single flat Praxiskurs price, not the
    // per-template price_gross_praxis_cents. The amount is the server-side
    // constant, never a client-supplied number, so it can't be tampered
    // with; the flag only selects the pricing rule. Product name +
    // description still come from the template above so the invoice reads
    // correctly. Ignored for anything that isn't a plain Praxiskurs (an
    // invite/rebooking keeps its own price).
    const isPraxisOffer = praxisOffer === true && courseType === "Praxiskurs" && !invite;
    if (isPraxisOffer) {
      unitAmount = PRAXISKURS_OFFER_PRICE_CENTS;
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

    // GA4 attribution: carry the client/session id through Stripe so the
    // webhook can send a server-side `purchase` conversion bound to the
    // original organic-search session. Only set when actually present.
    if (typeof gaClientId === "string" && gaClientId) {
      params["metadata[gaClientId]"] = gaClientId;
    }
    if (typeof gaSessionId === "string" && gaSessionId) {
      params["metadata[gaSessionId]"] = gaSessionId;
    }

    // Invite-specific additions:
    //   • Carry the token as metadata so the webhook can use the
    //     invite-aware RPC to bypass capacity and mark the invite used.
    //   • Auto-apply the stored Stripe promotion code if the admin
    //     attached one (e.g. a 100% free-seat discount).
    //   • Pre-fill the recipient email to discourage link resharing.
    if (invite) {
      params["metadata[inviteToken]"] = inviteToken;
      // For a rebooking the flat fee IS the price, so never layer a promo code
      // on top of it. Promo codes only apply to normal full-price invites.
      if (isRebooking) {
        // Also stop the doctor from entering their own promo code at Stripe to
        // chip away at the fixed Umbuchungsgebühr.
        delete params.allow_promotion_codes;
      } else if (invite.stripe_promotion_code_id) {
        params["discounts[0][promotion_code]"] = invite.stripe_promotion_code_id;
        // Stripe refuses both `discounts` and `allow_promotion_codes: true`
        // in the same request — drop the latter when we're applying one.
        delete params.allow_promotion_codes;
      }
      if (invite.recipient_email) {
        params.customer_email = invite.recipient_email;
      }
    }

    // Logged-in buyer (e.g. the Praxiskurs offer on /mein-konto): pre-fill
    // the Stripe email from their session. course_bookings is matched to a
    // person by email alone — no auszubildende_id FK — so a doctor who
    // types a different address at Stripe files the booking under a second
    // identity and never sees it in their account.
    //
    // The address comes from the auth session, never from the request body:
    // a client-supplied email here would let anyone bill a booking onto
    // someone else's account. Anonymous visitors just fall through and
    // Stripe asks for the email as before.
    if (!params.customer_email) {
      try {
        const authed = await createClient();
        const {
          data: { user },
        } = await authed.auth.getUser();
        if (user) {
          const { data: contact } = await supabase
            .from("v_auszubildende")
            .select("email")
            .eq("user_id", user.id)
            .maybeSingle();
          const email = contact?.email ?? user.email;
          if (email) params.customer_email = email;
        }
      } catch (err) {
        // Never fail a checkout over a prefill. Worst case the buyer types
        // their email at Stripe, exactly as before.
        console.error("[course-checkout] email prefill skipped:", err);
      }
    }

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
