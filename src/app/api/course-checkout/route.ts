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
    const { courseKey, courseType, sessionId, inviteToken } = await req.json();

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
    } | null = null;
    if (inviteToken) {
      const { data: inv } = await supabase
        .from("booking_invites")
        .select(
          "id, template_id, session_id, course_type, stripe_promotion_code_id, recipient_email, expires_at, revoked, used_count, max_uses",
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

    // Select per-type fields
    let productName: string;
    let description: string;
    let grossPrice: number;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proband-innen.ephia.de";
    const successUrl = `${baseUrl}/courses/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = "https://www.ephia.de";

    const isDentist = courseKey === "grundkurs_botulinum_zahnmedizin";

    if (isOnline) {
      productName = isDentist
        ? `${template.name_online || template.title} (Zahnmedizin)`
        : template.name_online || template.title;
      description = template.description_online || "";
      grossPrice = template.price_gross_online || 0;
    } else if (isPraxis) {
      productName = isDentist
        ? `${template.name_praxis || template.title} (Zahnmedizin) – ${sessionLabel}`
        : `${template.name_praxis || template.title} – ${sessionLabel}`;
      description = template.description_praxis || "";
      grossPrice = template.price_gross_praxis || 0;
    } else if (isPremium) {
      const isDermalfiller = courseKey === "grundkurs_dermalfiller";
      const isLippen = courseKey === "aufbaukurs_lippen";
      const isTherapeutischeIndikationen =
        courseKey === "aufbaukurs_therapeutische_indikationen_botulinum";
      productName = isDentist
        ? `Komplettpaket (Zahnmedizin) – ${sessionLabel}`
        : isDermalfiller
          ? `Komplettpaket Dermalfiller – ${sessionLabel}`
          : isLippen
            ? `Komplettpaket Lippen – ${sessionLabel}`
            : isTherapeutischeIndikationen
              ? `Komplettpaket Therapeutische Indikationen – ${sessionLabel}`
              : `Komplettpaket – ${sessionLabel}`;
      description = isDentist
        ? "Online- & Praxiskurs Botulinum + Onlinekurs Medizinische Hautpflege"
        : isDermalfiller
          ? "Online- & Praxiskurs Dermalfiller + Onlinekurs Medizinische Hautpflege + Aufbaukurs Lippen Onlinekurs"
          : isLippen
            ? "Online- & Praxiskurs Lippen + Onlinekurs Dermalfiller + Onlinekurs Medizinische Hautpflege + Onlinekurs Botulinum Periorale Zone"
            : isTherapeutischeIndikationen
              ? "Online- & Praxiskurs Therapeutische Indikationen + Onlinekurs Grundkurs Botulinum + Onlinekurs Medizinische Hautpflege"
              : "4 Onlinekurse + Praxiskurs Botulinum";
      // Hardcoded fallbacks when price_gross_premium isn't set in the DB.
      // - Zahnmedizin: DB value required (falls through to 0 = 400 error).
      // - Dermalfiller: 1290 + 250 + 490 = 2030 → -10% bundle = 1827.
      // - Lippen: 1140 (Kombi) + 490 (Dermalfiller online) + 250 (Hautpflege)
      //          + 340 (Periorale Zone) = 2220 → -10% bundle = 1998.
      // - Therapeutische Indikationen: 1140 (Kombi) + 490 (Botulinum online)
      //          + 250 (Hautpflege) = 1880 → -10% bundle = 1692.
      // - Humanmedizin (Botulinum): 2220 default.
      grossPrice = template.price_gross_premium || (
        isDentist ? 0 :
        isDermalfiller ? 2030 :
        isLippen ? 2220 :
        isTherapeutischeIndikationen ? 1880 :
        2220
      );
    } else {
      // Kombikurs
      productName = isDentist
        ? `${template.name_kombi || template.title} (Zahnmedizin) – ${sessionLabel}`
        : `${template.name_kombi || template.title} – ${sessionLabel}`;
      description = template.description_kombi || "";
      grossPrice = template.price_gross_kombi || 0;
    }

    let unitAmount = Math.round(grossPrice * 100); // EUR to cents

    // Humanmedizin Premium: apply 10% discount (Zahnmedizin uses DB price directly)
    if (isPremium && !isDentist) {
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

    // Invite-specific additions:
    //   • Carry the token as metadata so the webhook can use the
    //     invite-aware RPC to bypass capacity and mark the invite used.
    //   • Auto-apply the stored Stripe promotion code if the admin
    //     attached one (e.g. a 100% free-seat discount).
    //   • Pre-fill the recipient email to discourage link resharing.
    if (invite) {
      params["metadata[inviteToken]"] = inviteToken;
      if (invite.stripe_promotion_code_id) {
        params["discounts[0][promotion_code]"] = invite.stripe_promotion_code_id;
        // Stripe refuses both `discounts` and `allow_promotion_codes: true`
        // in the same request — drop the latter when we're applying one.
        delete params.allow_promotion_codes;
      }
      if (invite.recipient_email) {
        params.customer_email = invite.recipient_email;
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
