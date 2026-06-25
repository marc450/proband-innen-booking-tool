import { createAdminClient } from "@/lib/supabase/admin";
import { buildCourseLineItem, type CourseVariant } from "@/lib/course-pricing";
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
      "token, template_id, session_id, course_type, recipient_email, recipient_name, stripe_promotion_code_id, rebooking_fee_cents, expires_at, revoked, used_count, max_uses, course_templates(title, course_key, course_label_de, price_gross_online_cents, price_gross_praxis_cents, price_gross_kombi_cents, price_gross_premium_cents), course_sessions(label_de, date_iso), booking_invite_courses(template_id, session_id, course_type, sort_order, course_templates(title, course_key, course_label_de, name_online, name_praxis, name_kombi, price_gross_online_cents, price_gross_praxis_cents, price_gross_kombi_cents, price_gross_premium_cents), course_sessions(label_de, date_iso))",
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

  // Multi-course invite: render every attached course with a combined
  // total. Redemption pays for all of them in one Stripe checkout via
  // /api/einladung-checkout. Single-course invites fall through to the
  // original render below.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const multiCourses = ((invite.booking_invite_courses as any[]) || [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  if (multiCourses.length > 0) {
    const items = multiCourses.map((c) => {
      const t = c.course_templates ?? {};
      const s = c.course_sessions ?? null;
      const sessionLabel = s?.label_de || s?.date_iso || "";
      const { productName, grossPriceCents } = buildCourseLineItem({
        template: t,
        courseKey: t.course_key || "",
        courseType: c.course_type as CourseVariant,
        sessionLabel,
      });
      const courseLabel = t.course_label_de || t.title || productName || "EPHIA Kurs";
      return {
        courseLabel,
        variant:
          c.course_type === "Premium"
            ? "Komplettpaket"
            : c.course_type === "Kombikurs"
              ? "Online- & Praxiskurs"
              : c.course_type,
        sessionLabel,
        grossPriceCents,
      };
    });

    const totalBaseCents = items.reduce((sum, it) => sum + it.grossPriceCents, 0);
    const promo = await fetchPromoSnapshot(invite.stripe_promotion_code_id);

    let totalFinalCents = totalBaseCents;
    let discountLine: string | null = null;
    if (promo) {
      if (promo.percentOff != null) {
        const off = Math.round((totalBaseCents * promo.percentOff) / 100);
        totalFinalCents = Math.max(totalBaseCents - off, 0);
        discountLine = `${promo.percentOff}% Rabatt (${formatEur(off)})`;
      } else if (promo.amountOffCents != null) {
        totalFinalCents = Math.max(totalBaseCents - promo.amountOffCents, 0);
        discountLine = `${formatEur(promo.amountOffCents)} Rabatt`;
      } else {
        discountLine = "Rabatt wird beim Checkout angewendet";
      }
    }

    const firstNameMulti = firstNameOf(invite.recipient_name);

    return (
      <Shell>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          {firstNameMulti ? `Hi ${firstNameMulti}!` : "Deine Einladung"}
        </h1>
        <p className="text-sm text-black/70 mb-6">
          Hiermit senden wir Dir Deine persönliche Buchungseinladung zu folgenden Kursen:
        </p>

        <div className="bg-[#FAEBE1] rounded-[10px] p-5 text-left mb-6 space-y-3 text-sm">
          {items.map((it, i) => (
            <div key={i} className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{it.courseLabel}</p>
                <p className="text-black/60 text-xs">
                  {it.variant}
                  {it.sessionLabel ? ` · ${it.sessionLabel}` : ""}
                </p>
              </div>
              <span className="whitespace-nowrap">{formatEur(it.grossPriceCents)}</span>
            </div>
          ))}

          <div className="border-t border-black/10 pt-3 flex items-center justify-between">
            <span className="font-semibold">Gesamt:</span>
            {promo && totalFinalCents !== totalBaseCents ? (
              <span>
                <span className="line-through text-black/50 mr-1.5">{formatEur(totalBaseCents)}</span>
                <span className="font-semibold">{formatEur(totalFinalCents)}</span>
              </span>
            ) : (
              <span className="font-semibold">{formatEur(totalBaseCents)}</span>
            )}
          </div>
          {discountLine && (
            <p className="text-[#0066FF]">
              <span className="font-semibold">Rabatt:</span> {discountLine}
            </p>
          )}
        </div>

        <EinladungCheckout token={invite.token} multi label="Alle Kurse buchen" />

        <p className="text-xs text-black/50 mt-4">
          Nach dem Klick wirst Du zur sicheren Stripe-Kasse weitergeleitet.
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
  // sees exactly what Stripe will charge.
  const isDentist = courseKey === "grundkurs_botulinum_zahnmedizin";
  const isDermalfiller = courseKey === "grundkurs_dermalfiller";
  const isLippen = courseKey === "aufbaukurs_lippen";
  const isTherapeutischeIndikationen =
    courseKey === "aufbaukurs_therapeutische_indikationen_botulinum";

  let basePriceCents: number | null = null;
  if (invite.course_type === "Onlinekurs") {
    basePriceCents = tmpl?.price_gross_online_cents ?? null;
  } else if (invite.course_type === "Praxiskurs") {
    basePriceCents = tmpl?.price_gross_praxis_cents ?? null;
  } else if (invite.course_type === "Kombikurs") {
    basePriceCents = tmpl?.price_gross_kombi_cents ?? null;
  } else {
    // Premium / Komplettpaket. Hardcoded fallbacks match course-checkout
    // exactly for consistency when price_gross_premium_cents is null in DB.
    basePriceCents =
      tmpl?.price_gross_premium_cents ??
      (isDentist
        ? null
        : isDermalfiller
          ? 203000
          : isLippen
            ? 222000
            : isTherapeutischeIndikationen
              ? 188000
              : 222000);
  }

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

  // Umbuchung: a flat fee replaces the variant price entirely and no promo
  // applies, so the doctor sees exactly the Umbuchungsgebühr Stripe will charge.
  const rebookingFeeCents: number | null = invite.rebooking_fee_cents ?? null;
  const isRebooking = rebookingFeeCents != null;

  const promo = isRebooking ? null : await fetchPromoSnapshot(invite.stripe_promotion_code_id);

  let discountLine: string | null = null;
  let finalPriceCents: number | null = basePriceCents;
  if (isRebooking) {
    basePriceCents = rebookingFeeCents;
    finalPriceCents = rebookingFeeCents;
  } else if (promo && basePriceCents != null) {
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
            <span className="font-semibold">{isRebooking ? "Umbuchungsgebühr:" : "Preis:"}</span>{" "}
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
