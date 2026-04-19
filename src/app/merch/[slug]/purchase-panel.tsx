"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { MerchCheckoutLauncher } from "./checkout-launcher";

type Variant = {
  id: string;
  name: string;
  color: string | null;
  size: string | null;
  price_gross_cents: number;
  stock: number;
};

/**
 * Client-side wrapper around MerchCheckoutLauncher that lets the buyer
 * pick a size when the product has multiple size variants for the
 * selected color (e.g. SONJA X EPHIA T-Shirt · Weiss has sizes S, M, L)
 * and a quantity. Products with only one effective size (the cap's
 * "one-size") skip the size picker; the quantity stepper is always
 * shown when there's stock for more than one unit.
 *
 * Quantity is capped at min(variant.stock, MAX_QUANTITY_PER_ORDER).
 * MAX_QUANTITY_PER_ORDER keeps a single checkout from accidentally
 * draining all stock when someone holds + on the stepper.
 */
const MAX_QUANTITY_PER_ORDER = 10;

export function PurchasePanel({
  variants,
  productTitle,
  donates = false,
}: {
  variants: Variant[];
  productTitle: string;
  /** Forwarded to the launcher so only donating products (the cap)
   *  mention the 10 EUR Jenny De la Torre-Stiftung line in the modal. */
  donates?: boolean;
}) {
  // Strip virtual "one-size" from the picker. It's not a real size the
  // buyer chooses, just a placeholder we store so the schema can handle
  // t-shirts later without a migration.
  const pickable = useMemo(
    () =>
      variants
        .filter((v) => v.size && v.size.toLowerCase() !== "one-size")
        .sort((a, b) => sizeOrder(a.size) - sizeOrder(b.size)),
    [variants],
  );

  const [selectedId, setSelectedId] = useState<string>(() => {
    // Default to the first in-stock variant if any, else the first overall.
    const inStock = (pickable.length > 0 ? pickable : variants).find((v) => v.stock > 0);
    return (inStock || pickable[0] || variants[0]).id;
  });

  const [quantity, setQuantity] = useState(1);

  const selected =
    variants.find((v) => v.id === selectedId) || variants[0];

  // Clamp quantity whenever the selected variant changes (e.g. switching
  // to a size with less stock) so we never let the user submit > stock.
  useEffect(() => {
    if (!selected) return;
    const cap = Math.min(selected.stock, MAX_QUANTITY_PER_ORDER);
    setQuantity((q) => Math.min(Math.max(1, q), Math.max(1, cap)));
  }, [selected]);

  if (!selected) {
    return <p className="text-sm text-black/60">Keine Varianten verfügbar.</p>;
  }

  const maxQty = Math.min(selected.stock, MAX_QUANTITY_PER_ORDER);
  const showQuantity = selected.stock > 1;

  return (
    <div className="space-y-4">
      {pickable.length > 1 && (
        <div>
          <p className="text-xs font-medium text-black/70 mb-2">Größe</p>
          <div className="flex flex-wrap gap-2">
            {pickable.map((v) => {
              const isSelected = v.id === selected.id;
              const soldOut = v.stock <= 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => !soldOut && setSelectedId(v.id)}
                  disabled={soldOut}
                  className={`rounded-[10px] border px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                    soldOut
                      ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed line-through"
                      : isSelected
                        ? "border-[#0066FF] bg-[#0066FF]/5 text-[#0066FF]"
                        : "border-input bg-white text-black hover:border-foreground/40"
                  }`}
                >
                  {v.size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showQuantity && (
        <div>
          <p className="text-xs font-medium text-black/70 mb-2">Menge</p>
          <div className="inline-flex items-stretch overflow-hidden rounded-[10px] border border-input bg-white">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="px-3 text-black hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              aria-label="Menge verringern"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div
              className="min-w-[3rem] flex items-center justify-center text-sm font-semibold text-black tabular-nums border-x border-input"
              aria-live="polite"
              aria-label={`Menge: ${quantity}`}
            >
              {quantity}
            </div>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
              disabled={quantity >= maxQty}
              className="px-3 text-black hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              aria-label="Menge erhöhen"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {quantity >= maxQty && (
            <p className="mt-1.5 text-xs text-black/55">
              {maxQty === selected.stock
                ? `Nur noch ${selected.stock} auf Lager.`
                : `Maximal ${MAX_QUANTITY_PER_ORDER} pro Bestellung.`}
            </p>
          )}
        </div>
      )}

      <MerchCheckoutLauncher
        variantId={selected.id}
        productTitle={productTitle}
        variantLabel={selected.color || selected.name}
        priceCents={selected.price_gross_cents}
        stock={selected.stock}
        quantity={quantity}
        buttonText={selected.stock > 0 ? "Jetzt bestellen" : undefined}
        donates={donates}
      />
    </div>
  );
}

// Map common t-shirt size labels to an ordering index so the picker
// renders as XS → S → M → L → XL → XXL even when the DB returns them
// out of sort_order. Unknown labels fall through to alphabetical order
// at position 100+.
function sizeOrder(size: string | null): number {
  if (!size) return 999;
  const s = size.trim().toUpperCase();
  const map: Record<string, number> = {
    XS: 0,
    S: 1,
    M: 2,
    L: 3,
    XL: 4,
    XXL: 5,
    "3XL": 6,
  };
  return map[s] ?? 100 + s.charCodeAt(0);
}
