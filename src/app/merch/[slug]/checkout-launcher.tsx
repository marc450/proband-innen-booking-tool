"use client";

import { useEffect, useState } from "react";
import { Heart, Loader2, MapPin, X } from "lucide-react";
import {
  COMMUNITY_PICKUP_EVENT,
  isPickupOpen,
  isProductPickupEligible,
} from "@/lib/merch-pickup";

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
  /**
   * When true the modal subtitle mentions the 10 EUR donation to the
   * Jenny De la Torre-Stiftung. Only set for products that actually
   * trigger the donation (the cap). Other merch keeps a neutral subtitle.
   */
  donates?: boolean;
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
  donates = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDoctor, setIsDoctor] = useState<"" | "yes" | "no">("");
  const [delivery, setDelivery] = useState<"" | "shipping" | "pickup">("");

  const soldOut = stock <= 0;

  // Whether the modal should ask "Versand oder Abholung?". Only shown
  // for products on the eligibility list AND only while the pickup
  // window is still open. We also re-check on a 60s interval so the
  // option correctly disappears if a session sits idle past the
  // cutoff (relevant for buyers who left the modal open near 19:30
  // CEST on the event day).
  const productAllowsPickup = isProductPickupEligible(productSlug);
  const [pickupWindowOpen, setPickupWindowOpen] = useState(() =>
    isPickupOpen(),
  );
  useEffect(() => {
    if (!productAllowsPickup) return;
    const tick = () => setPickupWindowOpen(isPickupOpen());
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [productAllowsPickup]);
  const showDeliveryQuestion = productAllowsPickup && pickupWindowOpen;

  // Default the delivery choice to "shipping" for any non-eligible
  // product (cap, future merch) so the form is always submittable
  // even when the question doesn't render. Eligible products start
  // with no choice so the buyer is forced to make one.
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
            : buttonText ?? `Schickt sie mir in ${variantLabel}!`}
        </span>
        {!soldOut && <Heart className="h-4 w-4" />}
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
                  ? "Abholung beim Community Event · kein Versand"
                  : donates
                    ? `Versand 2,90 € · Spende 10 € an De la Torre-Stiftung pro Cap${quantity > 1 ? ` (${quantity}× = ${(quantity * 10).toLocaleString("de-DE")} €)` : ""}`
                    : "Versand 2,90 €"}
              </span>
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">Bist Du Ärzt:in?</label>
                <p className="text-xs text-black/55">
                  Nur für unsere interne Einordnung. Hat keinen Einfluss auf
                  Preis, Versand oder Deine Bestellung.
                </p>
                <div className="flex gap-2">
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
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Versand oder Abholung beim Community Event?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
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
                      Abholung beim Community Event
                    </button>
                  </div>
                  {delivery === "pickup" && (
                    <div className="rounded-[10px] bg-[#FAEBE1] px-3 py-3 text-xs text-[#733D29] space-y-1.5">
                      <p className="font-semibold">EPHIA Community Event</p>
                      <p>{COMMUNITY_PICKUP_EVENT.dateLabel}, {COMMUNITY_PICKUP_EVENT.timeLabel}</p>
                      <p className="flex items-start gap-1.5">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span>{COMMUNITY_PICKUP_EVENT.location}</span>
                      </p>
                    </div>
                  )}
                  {delivery === "shipping" && (
                    <p className="text-xs text-black/55">
                      Hinweis: Versand erfolgt erst nach dem Community Event am{" "}
                      {COMMUNITY_PICKUP_EVENT.dateLabel}.
                    </p>
                  )}
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
