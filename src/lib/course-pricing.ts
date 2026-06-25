// Single source of truth for Auszubildende course pricing + Stripe line-item
// copy. Used by /api/course-checkout (single booking), /api/einladung-checkout
// (combined multi-course invite), the public /einladung/[token] page (price
// display), and the Stripe webhook (per-course amount split). Keeping the
// price math in one place stops the funnel and the landing page from drifting.

export type CourseVariant = "Onlinekurs" | "Praxiskurs" | "Kombikurs" | "Premium";

export type CourseTemplateForPricing = {
  title?: string | null;
  name_online?: string | null;
  name_praxis?: string | null;
  name_kombi?: string | null;
  description_online?: string | null;
  description_praxis?: string | null;
  description_kombi?: string | null;
  price_gross_online_cents?: number | null;
  price_gross_praxis_cents?: number | null;
  price_gross_kombi_cents?: number | null;
  price_gross_premium_cents?: number | null;
};

export type CourseLineItem = {
  productName: string;
  description: string;
  // Final gross amount in cents that Stripe should charge for this single
  // course (Premium already includes the 10% Humanmedizin bundle discount).
  // Promo codes and Umbuchung fees are applied by the caller on top.
  grossPriceCents: number;
};

/**
 * Build the Stripe line item (name, description, gross price in cents) for a
 * single course variant. Mirrors the per-type logic that used to live inline
 * in /api/course-checkout so every surface charges and displays the same
 * amount.
 */
export function buildCourseLineItem(args: {
  template: CourseTemplateForPricing;
  courseKey: string;
  courseType: CourseVariant;
  sessionLabel?: string;
}): CourseLineItem {
  const { template, courseKey, courseType, sessionLabel = "" } = args;
  const isDentist = courseKey === "grundkurs_botulinum_zahnmedizin";

  if (courseType === "Onlinekurs") {
    return {
      productName: isDentist
        ? `${template.name_online || template.title} (Zahnmedizin)`
        : template.name_online || template.title || "",
      description: template.description_online || "",
      grossPriceCents: template.price_gross_online_cents || 0,
    };
  }

  if (courseType === "Praxiskurs") {
    return {
      productName: isDentist
        ? `${template.name_praxis || template.title} (Zahnmedizin) – ${sessionLabel}`
        : `${template.name_praxis || template.title} – ${sessionLabel}`,
      description: template.description_praxis || "",
      grossPriceCents: template.price_gross_praxis_cents || 0,
    };
  }

  if (courseType === "Premium") {
    const isDermalfiller = courseKey === "grundkurs_dermalfiller";
    const isLippen = courseKey === "aufbaukurs_lippen";
    const isTherapeutischeIndikationen =
      courseKey === "aufbaukurs_therapeutische_indikationen_botulinum";

    const productName = isDentist
      ? `Komplettpaket (Zahnmedizin) – ${sessionLabel}`
      : isDermalfiller
        ? `Komplettpaket Dermalfiller – ${sessionLabel}`
        : isLippen
          ? `Komplettpaket Lippen – ${sessionLabel}`
          : isTherapeutischeIndikationen
            ? `Komplettpaket Therapeutische Indikationen – ${sessionLabel}`
            : `Komplettpaket – ${sessionLabel}`;

    const description = isDentist
      ? "Online- & Praxiskurs Botulinum + Onlinekurs Medizinische Hautpflege"
      : isDermalfiller
        ? "Online- & Praxiskurs Dermalfiller + Onlinekurs Medizinische Hautpflege + Aufbaukurs Lippen Onlinekurs"
        : isLippen
          ? "Online- & Praxiskurs Lippen + Onlinekurs Dermalfiller + Onlinekurs Medizinische Hautpflege + Onlinekurs Botulinum Periorale Zone"
          : isTherapeutischeIndikationen
            ? "Online- & Praxiskurs Therapeutische Indikationen + Onlinekurs Grundkurs Botulinum + Onlinekurs Medizinische Hautpflege"
            : "4 Onlinekurse + Praxiskurs Botulinum";

    // Hardcoded fallbacks when price_gross_premium_cents isn't set in the DB.
    // - Zahnmedizin: DB value required (falls through to 0 = caller errors).
    // - Dermalfiller: 1290 + 250 + 490 = 2030 → -10% bundle = 1827.
    // - Lippen: 1140 (Kombi) + 490 (Dermalfiller online) + 250 (Hautpflege)
    //          + 340 (Periorale Zone) = 2220 → -10% bundle = 1998.
    // - Therapeutische Indikationen: 1140 (Kombi) + 490 (Botulinum online)
    //          + 250 (Hautpflege) = 1880 → -10% bundle = 1692.
    // - Humanmedizin (Botulinum): 2220 default.
    const base =
      template.price_gross_premium_cents ||
      (isDentist
        ? 0
        : isDermalfiller
          ? 203000
          : isLippen
            ? 222000
            : isTherapeutischeIndikationen
              ? 188000
              : 222000);

    // Humanmedizin Premium gets a 10% bundle discount; Zahnmedizin uses the
    // DB price directly.
    const grossPriceCents = isDentist ? base : Math.round(base * 0.9);
    return { productName, description, grossPriceCents };
  }

  // Kombikurs
  return {
    productName: isDentist
      ? `${template.name_kombi || template.title} (Zahnmedizin) – ${sessionLabel}`
      : `${template.name_kombi || template.title} – ${sessionLabel}`,
    description: template.description_kombi || "",
    grossPriceCents: template.price_gross_kombi_cents || 0,
  };
}
