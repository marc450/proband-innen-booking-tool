"use client";

import { useState } from "react";
import { Heart, Loader2, X } from "lucide-react";

interface Props {
  variantId: string;
  productTitle: string;
  variantLabel: string;
  priceCents: number;
  stock: number;
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
 * that captures name + email + phone + Ärzt:in flag, then posts to
 * /api/merch-checkout which responds with the Stripe Checkout URL.
 */
export function MerchCheckoutLauncher({
  variantId,
  productTitle,
  variantLabel,
  priceCents,
  stock,
  buttonText,
}: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isDoctor, setIsDoctor] = useState<"" | "yes" | "no">("");

  const soldOut = stock <= 0;

  const reset = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setIsDoctor("");
    setError(null);
    setSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim() || !isDoctor) {
      setError("Bitte alle Felder ausfüllen.");
      return;
    }

    setSubmitting(true);
    // Retry the POST up to 3 times on transient network errors ("Failed to
    // fetch") with a short backoff. Server-side errors (non-2xx) short-
    // circuit immediately so we don't spam Stripe with duplicates.
    const payload = JSON.stringify({
      variantId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      isDoctor: isDoctor === "yes",
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
        // TypeError from fetch — transient. Retry.
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
              {productTitle} · {variantLabel} · {priceLabel}
              <br />
              <span className="text-xs text-black/50">Versand 2,90 € · Spende 10 € an De la Torre-Stiftung inklusive</span>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Vorname</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-[10px] border border-input bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0066FF]/30 focus:border-[#0066FF]"
                    autoComplete="given-name"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Nachname</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-[10px] border border-input bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0066FF]/30 focus:border-[#0066FF]"
                    autoComplete="family-name"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">E-Mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-[10px] border border-input bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0066FF]/30 focus:border-[#0066FF]"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Telefon</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-[10px] border border-input bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0066FF]/30 focus:border-[#0066FF]"
                  autoComplete="tel"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">Bist Du Ärzt:in?</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDoctor("yes")}
                    className={`flex-1 rounded-[10px] border py-2 text-sm font-medium transition-colors cursor-pointer ${
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
                    className={`flex-1 rounded-[10px] border py-2 text-sm font-medium transition-colors cursor-pointer ${
                      isDoctor === "no"
                        ? "border-[#0066FF] bg-[#0066FF]/5 text-[#0066FF]"
                        : "border-input bg-white hover:bg-gray-50"
                    }`}
                  >
                    Nein
                  </button>
                </div>
              </div>

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

              <p className="text-xs text-black/50 text-center">
                Versandadresse und Zahlung werden im nächsten Schritt bei Stripe erfasst.
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
