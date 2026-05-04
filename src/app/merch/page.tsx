import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import type { MerchProduct, MerchProductVariant } from "@/lib/types";
import { EphiaHilft } from "./_components/ephia-hilft";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "EPHIA Merch",
  description: "Merch von EPHIA. Den gesamten Erlös spenden wir an die Jenny De la Torre-Stiftung.",
};

/**
 * One tile per (product, color). For products without colorways the tile
 * falls back to the product itself. This keeps a product with N colors
 * rendering as N tiles on the grid (e.g. Cap Schwarz + Cap Beige) while
 * a future pure one-variant product still shows up as a single tile.
 * Size variants intentionally collapse into a single tile per color —
 * the buyer picks the size on the detail page.
 */
type Tile = {
  key: string;
  productSlug: string;
  productTitle: string;
  productSubtitle: string | null;
  color: string | null;
  priceCents: number;
  hasStock: boolean;
  imageUrl: string | null;
};

export default async function MerchIndexPage() {
  const admin = createAdminClient();

  const [{ data: products }, { data: variants }] = await Promise.all([
    admin.from("merch_products").select("*").eq("is_active", true).order("created_at"),
    admin.from("merch_product_variants").select("*").eq("is_active", true).order("sort_order"),
  ]);

  const productList = (products ?? []) as MerchProduct[];
  const variantList = (variants ?? []) as MerchProductVariant[];
  const productById = new Map(productList.map((p) => [p.id, p]));

  // Group variants into display tiles: one per (product_id, color). When a
  // product has no colorways at all (all variants color=null), emit a
  // single tile for the product itself.
  const tiles: Tile[] = [];
  const tileIndex = new Map<string, number>();
  for (const v of variantList) {
    const product = productById.get(v.product_id);
    if (!product) continue;
    const color = v.color || null;
    const key = `${v.product_id}|${color ?? ""}`;
    const existingIndex = tileIndex.get(key);
    if (existingIndex != null) {
      const tile = tiles[existingIndex];
      tile.priceCents = Math.min(tile.priceCents, v.price_gross_cents);
      tile.hasStock = tile.hasStock || v.stock > 0;
      if (!tile.imageUrl && v.image_url) tile.imageUrl = v.image_url;
      continue;
    }
    tiles.push({
      key,
      productSlug: product.slug,
      productTitle: product.title,
      productSubtitle: product.subtitle,
      color,
      priceCents: v.price_gross_cents,
      hasStock: v.stock > 0,
      imageUrl: v.image_url || product.image_url || null,
    });
    tileIndex.set(key, tiles.length - 1);
  }

  return (
    <div>
      <div className="max-w-4xl mx-auto px-5 md:px-8 py-16 md:py-20">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold">EPHIA Merch</h1>
          <p className="mt-3 text-black/70 max-w-2xl mx-auto">
            Mit jedem Stück unterstützt Du unsere Mission für evidenzbasierte,
            patient:innenzentrierte Behandlungen.
          </p>
        </div>

        {tiles.length === 0 ? (
          <div className="bg-white rounded-[10px] p-10 text-center">
            <p className="text-black/70">Aktuell keine Produkte verfügbar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
            {tiles.map((t) => (
              <Link
                key={t.key}
                // Pass the color through so the detail page can render a
                // single targeted buy CTA instead of relisting the other
                // colorways that are already here on the index grid.
                href={t.color ? `/merch/${t.productSlug}?color=${encodeURIComponent(t.color)}` : `/merch/${t.productSlug}`}
                className="bg-white rounded-[10px] overflow-hidden flex flex-col group transition-shadow hover:shadow-lg"
              >
                {t.imageUrl ? (
                  <div className="relative aspect-[4/3] bg-black/5 overflow-hidden">
                    <Image
                      src={t.imageUrl}
                      alt={t.color ? `${t.productTitle} ${t.color}` : t.productTitle}
                      fill
                      quality={85}
                      sizes="(min-width: 640px) 50vw, 100vw"
                      // object-cover (default center positioning): the
                      // 4:3 frame is fully filled, content is cropped
                      // equally from top + bottom of the source. The
                      // detail-page gallery uses object-contain so the
                      // full image is still reachable from there.
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                ) : (
                  <div className="aspect-[4/3] flex items-center justify-center bg-black/5" aria-hidden="true">
                    <ImageIcon className="w-12 h-12 text-black/20" />
                  </div>
                )}
                <div className="p-5 flex-1 flex flex-col">
                  <h2 className="text-xl font-bold">
                    {t.productTitle}
                    {t.color ? ` · ${t.color}` : ""}
                  </h2>
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <span className="text-lg font-semibold">
                      {(t.priceCents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                    </span>
                    {t.hasStock ? (
                      <span className="text-xs font-medium bg-emerald-50 text-emerald-700 rounded-full px-2.5 py-1">
                        Verfügbar
                      </span>
                    ) : (
                      <span className="text-xs font-medium bg-gray-100 text-gray-700 rounded-full px-2.5 py-1">
                        Ausverkauft
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <EphiaHilft />
    </div>
  );
}
