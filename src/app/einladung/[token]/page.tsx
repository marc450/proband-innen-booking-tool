import { createAdminClient } from "@/lib/supabase/admin";
import { EinladungCheckout } from "./checkout-client";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "EPHIA Einladung",
  robots: { index: false, follow: false },
};

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;

/** Format a cent amount as a EUR price, e.g. 129900 → "EUR 1.299,00". */
function formatEur(cents: number | null | undefined): string | null {
  if (cents == null || !Number.isFinite(cents)) return null;
  return (cents / 100).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}

/** First token of a full name (skips empty/whitespace). */
function firstNameOf(full: string | null | undefined): string | null {
  if (!full) return null;
  const first = full.trim().split(/\s+/)[0];
  return first || null;
}

type PromoSnapshot = {
  code: string;
  percentOff: number | null;
  amountOffCents: number | null;
};

/**
 * Fetch the applied promotion code from Stripe so we can show the discount
 * on the landing page. Best-effort: any failure collapses to null so the
 * page still renders cleanly without the promo row.
 */
async function fetchPromoSnapshot(id: string | null): Promise<PromoSnapshot | null> {
  if (!id || !STRIPE_SECRET_KEY) return null;
  try {
    const res = await fetch(
      `https://api.stripe.com/v1/promotion_codes/${id}?expand[]=coupon`,
      { headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    return {
      code: json.code as string,
      percentOff: json.coupon?.percent_off ?? null,
      amountOffCents: json.coupon?.amount_off ?? null,
    };
  } catch {
    return null;
  }
}

export default async function EinladungPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("booking_invites")
    .select(
      "token, template_id, session_id, course_type, recipient_email, recipient_name, stripe_promotion_code_id, expires_at, revoked, used_count, max_uses, course_templates(title, course_key, course_label_de, price_gross_online, price_gross_praxis, price_gross_kombi, price_gross_premium), course_sessions(label_de, date_iso)",
    )
    .eq("token", token)
    .maybeSingle();

  // Tiny shared outer wrapper
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-[#FAEBE1] flex items-center justify-center px-5 py-12">
      <div className="max-w-lg w-full bg-white rounded-[10px] shadow-sm p-8 md:p-10 text-center">
        {children}
      </div>
    </div>
  );

  if (!invite) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold mb-3">Einladung nicht gefunden</h1>
        <p className="text-sm text-black/70">
          Der Link ist ungültig oder wurde entfernt. Schreib uns gerne unter{" "}
          <a href="mailto:customerlove@ephia.de" className="text-[#0066FF] underline">customerlove@ephia.de</a>.
        </p>
      </Shell>
    );
  }

  if (invite.revoked) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold mb-3">Einladung widerrufen</h1>
        <p className="text-sm text-black/70">
          Diese Einladung ist nicht mehr gültig. Bitte wende Dich an{" "}
          <a href="mailto:customerlove@ephia.de" className="text-[#0066FF] underline">customerlove@ephia.de</a>.
        </p>
      </Shell>
    );
  }
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold mb-3">Einladung abgelaufen</h1>
        <p className="text-sm text-black/70">
          Der Einlösezeitraum ist vorbei. Bitte wende Dich an{" "}
          <a href="mailto:customerlove@ephia.de" className="text-[#0066FF] underline">customerlove@ephia.de</a>.
        </p>
      </Shell>
    );
  }
  if (invite.used_count >= invite.max_uses) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold mb-3">Einladung bereits eingelöst</h1>
        <p className="text-sm text-black/70">
          Diese Einladung wurde bereits genutzt. Bei Fragen schreib uns unter{" "}
          <a href="mailto:customerlove@ephia.de" className="text-[#0066FF] underline">customerlove@ephia.de</a>.
        </p>
      </Shell>
    );
  }

  // The `course_templates(...)` / `course_sessions(...)` joins come back
  // as arrays from the type generator; the runtime shape is a single row.
  // Cast defensively so the render is happy on both ends.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tmpl = (invite.course_templates as any) ?? null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sess = (invite.course_sessions as any) ?? null;

  const courseLabel = tmpl?.course_label_de || tmpl?.title || "EPHIA Kurs";
  const courseKey = tmpl?.course_key || "";
  const sessionLabel = sess?.label_de || sess?.date_iso || null;

  const variantLabel =
    invite.course_type === "Premium"
      ? "Komplettpaket"
      : invite.course_type === "Kombikurs"
        ? "Online- & Praxiskurs"
        : invite.course_type;

  // Price logic mirrors src/app/api/course-checkout/route.ts so the user
  // sees exactly what Stripe will charge. course_templates.price_gross_*
  // columns are stored in EUR (not cents); cents = EUR * 100.
  const isDentist = courseKey === "grundkurs_botulinum_zahnmedizin";
  const isDermalfiller = courseKey === "grundkurs_dermalfiller";
  const isLippen = courseKey === "aufbaukurs_lippen";
  const isTherapeutischeIndikationen =
    courseKey === "aufbaukurs_therapeutische_indikationen_botulinum";

  let grossPriceEur: number | null = null;
  if (invite.course_type === "Onlinekurs") {
    grossPriceEur = tmpl?.price_gross_online ?? null;
  } else if (invite.course_type === "Praxiskurs") {
    grossPriceEur = tmpl?.price_gross_praxis ?? null;
  } else if (invite.course_type === "Kombikurs") {
    grossPriceEur = tmpl?.price_gross_kombi ?? null;
  } else {
    // Premium / Komplettpaket. Hardcoded fallbacks match course-checkout
    // exactly for consistency when price_gross_premium is null in DB.
    grossPriceEur =
      tmpl?.price_gross_premium ??
      (isDentist
        ? null
        : isDermalfiller
          ? 2030
          : isLippen
            ? 2220
            : isTherapeutischeIndikationen
              ? 1880
              : 2220);
  }

  let basePriceCents: number | null =
    grossPriceEur != null ? Math.round(grossPriceEur * 100) : null;

  // Humanmedizin Premium gets a 10% bundle discount (Zahnmedizin uses the
  // DB price directly). This isn't a promo code, it's baked into the
  // Stripe line item in course-checkout, so show it as the base price.
  if (
    invite.course_type === "Premium" &&
    !isDentist &&
    basePriceCents != null
  ) {
    basePriceCents = Math.round(basePriceCents * 0.9);
  }

  const promo = await fetchPromoSnapshot(invite.stripe_promotion_code_id);

  let discountLine: string | null = null;
  let finalPriceCents: number | null = basePriceCents;
  if (promo && basePriceCents != null) {
    if (promo.percentOff != null) {
      const off = Math.round((basePriceCents * promo.percentOff) / 100);
      finalPriceCents = Math.max(basePriceCents - off, 0);
      discountLine = `${promo.percentOff}% Rabatt (${formatEur(off)})`;
    } else if (promo.amountOffCents != null) {
      finalPriceCents = Math.max(basePriceCents - promo.amountOffCents, 0);
      discountLine = `${formatEur(promo.amountOffCents)} Rabatt`;
    } else {
      discountLine = "Rabatt wird beim Checkout angewendet";
    }
  }

  const firstName = firstNameOf(invite.recipient_name);

  return (
    <Shell>
      <h1 className="text-2xl md:text-3xl font-bold mb-2">
        {firstName ? `Hi ${firstName}!` : "Deine Einladung"}
      </h1>
      <p className="text-sm text-black/70 mb-6">
        Hiermit senden wir Dir Deine persönliche Buchungseinladung zu folgendem Kurs:
      </p>

      <div className="bg-[#FAEBE1] rounded-[10px] p-5 text-left mb-6 space-y-1.5 text-sm">
        <p><span className="font-semibold">Kurs:</span> {courseLabel}</p>
        <p><span className="font-semibold">Variante:</span> {variantLabel}</p>
        {sessionLabel && (
          <p><span className="font-semibold">Termin:</span> {sessionLabel}</p>
        )}
        {basePriceCents != null && (
          <p>
            <span className="font-semibold">Preis:</span>{" "}
            {promo && finalPriceCents !== basePriceCents ? (
              <>
                <span className="line-through text-black/50 mr-1.5">{formatEur(basePriceCents)}</span>
                <span className="font-semibold">{formatEur(finalPriceCents)}</span>
              </>
            ) : (
              formatEur(basePriceCents)
            )}
          </p>
        )}
        {discountLine && (
          <p className="text-[#0066FF]">
            <span className="font-semibold">Rabatt:</span> {discountLine}
          </p>
        )}
      </div>

      <EinladungCheckout
        token={invite.token}
        courseKey={courseKey}
        courseType={invite.course_type}
        sessionId={invite.session_id}
      />

      <p className="text-xs text-black/50 mt-4">
        Nach dem Klick wirst Du zur sicheren Stripe-Kasse weitergeleitet.
      </p>
    </Shell>
  );
}
