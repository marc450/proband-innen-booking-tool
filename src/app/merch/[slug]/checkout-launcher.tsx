"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { COURSE_PICKUP, isProductPickupEligible } from "@/lib/merch-pickup";

interface Props {
  variantId: string;
  productTitle: string;
  /** Slug of the parent product. Used to decide whether the
   *  community-event pickup option should appear in the modal. */
  productSlug?: string;
  variantLabel: string;
  priceCents: number;
  stock: number;
  /**
   * How many units the user wants to order. Defaults to 1 for legacy
   * callers that don't render the stepper. PurchasePanel always sets
   * this; the API also re-validates against stock server-side so a
   * tampered value can't oversell.
   */
  quantity?: number;
  /**
   * Optional override for the CTA label. When the product detail page is
   * scoped to one pre-selected variant (via /merch/[slug]?color=...) we
   * pass "Jetzt bestellen" so the button doesn't redundantly name the
   * color the user just clicked on the index tile. When omitted the
   * launcher falls back to the original playful "Schickt sie mir in
   * <variantLabel>!" copy for contexts that still render one button per
   * variant.
   */
  buttonText?: string;
}

/**
 * CTA button for one product variant. On click it opens a small modal
 * with a single question — "Bist Du Ärzt:in?" — then POSTs to
 * /api/merch-checkout which responds with the Stripe Checkout URL.
 * Stripe Checkout itself collects name, email, phone, and shipping
 * address, so we intentionally do not re-ask for those here.
 */
export function MerchCheckoutLauncher({
  variantId,
  productTitle,
  productSlug,
  variantLabel,
  priceCents,
  stock,
  quantity = 1,
  buttonText,
}: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDoctor, setIsDoctor] = useState<"" | "yes" | "no">("");
  const [delivery, setDelivery] = useState<"" | "shipping" | "pickup">("");

  const soldOut = stock <= 0;

  // Whether the modal should ask "Versand oder Abholung im Kurs?". Course
  // pickup is offered on every product, so this shows for any real product.
  const showDeliveryQuestion = isProductPickupEligible(productSlug);

  // Default the delivery choice to "shipping" for products that don't offer
  // pickup; otherwise leave it unset so the buyer actively picks Versand vs
  // Abholung im Kurs.
  useEffect(() => {
    if (!showDeliveryQuestion) {
      setDelivery("shipping");
    } else {
      setDelivery("");
    }
  }, [showDeliveryQuestion]);

  const reset = () => {
    setIsDoctor("");
    setDelivery(showDeliveryQuestion ? "" : "shipping");
    setError(null);
    setSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isDoctor) {
      setError("Bitte eine Auswahl treffen.");
      return;
    }
    if (showDeliveryQuestion && !delivery) {
      setError("Bitte Versand oder Abholung wählen.");
      return;
    }

    setSubmitting(true);

    // Retry the POST up to 3 times on transient network errors ("Failed
    // to fetch") with a short backoff. Server-side errors (non-2xx)
    // short-circuit immediately so we don't spam Stripe with duplicates.
    const payload = JSON.stringify({
      variantId,
      quantity,
      isDoctor: isDoctor === "yes",
      pickupAtEvent: delivery === "pickup",
    });
    let lastNetErr: string | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch("/api/merch-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) {
          setError(data.error || `Checkout konnte nicht gestartet werden (HTTP ${res.status}).`);
          setSubmitting(false);
          return;
        }
        window.location.href = data.url;
        return;
      } catch (err) {
        lastNetErr = err instanceof Error ? err.message : "Unerwarteter Netzwerkfehler.";
        console.warn(`merch-checkout fetch attempt ${attempt} failed:`, err);
        if (attempt < 3) await new Promise((r) => setTimeout(r, 400 * attempt));
      }
    }
    setError(
      `Verbindungsproblem: ${lastNetErr}. Bitte neu laden (Cmd+Shift+R) oder Browser-Erweiterungen prüfen (z.B. Adblocker).`,
    );
    setSubmitting(false);
  };

  const priceLabel = (priceCents / 100).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
  const subtotalLabel = ((priceCents * quantity) / 100).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });

  return (
    <>
      <button
        type="button"
        onClick={() => !soldOut && setOpen(true)}
        disabled={soldOut}
        className={`w-full rounded-[10px] font-bold py-3.5 px-5 text-center transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2 ${
          soldOut
            ? "bg-gray-200 text-gray-500"
            : "bg-[#0066FF] text-white hover:bg-[#0055DD]"
        }`}
      >
        <span>
          {soldOut
            ? `Ausverkauft: ${variantLabel}`
            : `${buttonText ?? `Schickt sie mir in ${variantLabel}!`} · ${subtotalLabel}`}
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) {
              setOpen(false);
              reset();
            }
          }}
        >
          <div className="bg-white rounded-[10px] w-full max-w-md p-6 md:p-8 relative">
            <button
              type="button"
              onClick={() => {
                if (!submitting) {
                  setOpen(false);
                  reset();
                }
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              aria-label="Schließen"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-1">Deine Bestellung</h2>
            <p className="text-sm text-black/70 mb-5">
              {productTitle} · {variantLabel}
              {quantity > 1 ? (
                <>
                  {" "}· {priceLabel} × {quantity} ={" "}
                  <strong className="font-semibold text-black">{subtotalLabel}</strong>
                </>
              ) : (
                <> · {priceLabel}</>
              )}
              <br />
              <span className="text-xs text-black/50">
                {delivery === "pickup"
                  ? "Abholung im Kurs · kein Versand"
                  : "Versand 2,90 €"}
              </span>
            </p>

            <form onSubmit={handleSubmit} className="space-y-7">
              <div className="space-y-3">
                <label className="text-sm font-medium">Bist Du Ärzt:in?</label>
                <p className="text-xs text-black/55">
                  Nur für unsere interne Einordnung. Hat keinen Einfluss auf
                  Preis, Versand oder Deine Bestellung.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsDoctor("yes")}
                    className={`flex-1 rounded-[10px] border py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                      isDoctor === "yes"
                        ? "border-[#0066FF] bg-[#0066FF]/5 text-[#0066FF]"
                        : "border-input bg-white hover:bg-gray-50"
                    }`}
                  >
                    Ja
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDoctor("no")}
                    className={`flex-1 rounded-[10px] border py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                      isDoctor === "no"
                        ? "border-[#0066FF] bg-[#0066FF]/5 text-[#0066FF]"
                        : "border-input bg-white hover:bg-gray-50"
                    }`}
                  >
                    Nein
                  </button>
                </div>
              </div>

              {showDeliveryQuestion && (
                <div className="space-y-4">
                  <label className="text-sm font-medium block">
                    Versand oder Abholung im Kurs?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDelivery("shipping")}
                      className={`rounded-[10px] border py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                        delivery === "shipping"
                          ? "border-[#0066FF] bg-[#0066FF]/5 text-[#0066FF]"
                          : "border-input bg-white hover:bg-gray-50"
                      }`}
                    >
                      Versand (2,90 €)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDelivery("pickup")}
                      className={`rounded-[10px] border py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                        delivery === "pickup"
                          ? "border-[#0066FF] bg-[#0066FF]/5 text-[#0066FF]"
                          : "border-input bg-white hover:bg-gray-50"
                      }`}
                    >
                      {COURSE_PICKUP.label}
                    </button>
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#0066FF] hover:bg-[#0055DD] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-[10px] py-3.5 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Einen Moment…
                  </>
                ) : (
                  "Zur sicheren Kasse"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
