import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import type { MerchProduct, MerchProductVariant } from "@/lib/types";
import { PurchasePanel } from "./purchase-panel";
import { ProductGallery } from "./product-gallery";
import { ProductDescription } from "./product-description";
import { EphiaHilft } from "../_components/ephia-hilft";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return {
    title: `EPHIA Merch · ${slug}`,
    description: "EPHIA Merch. Mit jedem Stück unterstützen wir die Jenny De la Torre-Stiftung.",
  };
}

export default async function MerchProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ color?: string | string[] }>;
}) {
  const { slug } = await params;
  const { color } = await searchParams;
  const requestedColor = Array.isArray(color) ? color[0] : color;

  // Admin client: service-role server-side read that bypasses RLS so anon
  // visitors can actually see the product page.
  const admin = createAdminClient();

  const { data: product } = await admin
    .from("merch_products")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!product) notFound();
  const p = product as MerchProduct;

  const { data: variantsData } = await admin
    .from("merch_product_variants")
    .select("*")
    .eq("product_id", p.id)
    .eq("is_active", true)
    .order("sort_order");

  const variants = (variantsData ?? []) as MerchProductVariant[];

  // The /merch index links into this page with ?color=<variant.color> so
  // we can scope the CTA and hero to a single colorway even when the
  // product has several. If the product has size variants (e.g. SONJA X
  // EPHIA T-Shirt in S/M/L) they all share the same color and become the
  // picker inside PurchasePanel. Fall back to the first colorway for
  // direct navigation without a query string.
  const colorKey = (requestedColor || variants[0]?.color || "").toLowerCase();
  const variantsForColor = colorKey
    ? variants.filter((v) => (v.color || "").toLowerCase() === colorKey)
    : variants;
  const selected = variantsForColor[0] || null;

  // Build the gallery image list: variant-specific image first (if set),
  // then product images 1-6. Dedupe and drop empties. Always at least one
  // entry when any image is configured.
  const galleryImages = [
    selected?.image_url,
    p.image_url,
    p.image_url_2,
    p.image_url_3,
    p.image_url_4,
    p.image_url_5,
    p.image_url_6,
  ]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter((x, i, arr) => x && arr.indexOf(x) === i);
  const galleryAlt = selected?.color ? `${p.title} ${selected.color}` : p.title;

  return (
    <div>
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-5 md:px-8 pt-8 md:pt-20 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-16 items-center">
          <div>
            {/* Replace ASCII hyphens with non-breaking hyphens (U+2011)
              * so titles like "SONJA X EPHIA T-Shirt" don't break in
              * the middle of "T-Shirt" on narrow viewports. The browser
              * is then forced to break on a space (between EPHIA and
              * T-Shirt) which reads cleanly. */}
            <h1 className="text-3xl md:text-5xl font-bold leading-tight">
              {p.title.replace(/-/g, "‑")}
            </h1>
            {selected?.color && (
              <p className="mt-3 text-sm font-medium text-black/70">
                Farbe: <span className="font-semibold text-black">{selected.color}</span>
              </p>
            )}

            {/* Mobile-only gallery: sits between "Farbe: …" and the
                Beschreibung so shoppers see the product before reading
                the copy. Hidden on md+ where the dedicated right-column
                gallery takes over. */}
            <div className="md:hidden mt-6">
              <ProductGallery
                images={galleryImages}
                alt={galleryAlt}
                priority
              />
            </div>

            {p.description && <ProductDescription text={p.description} />}

            <div className="mt-8 max-w-md">
              <PurchasePanel
                productTitle={p.title}
                productSlug={p.slug}
                variants={variantsForColor.map((v) => ({
                  id: v.id,
                  name: v.name,
                  color: v.color,
                  size: v.size,
                  price_gross_cents: v.price_gross_cents,
                  stock: v.stock,
                }))}
              />
            </div>
          </div>

          {/* Product gallery (desktop only — mobile renders it above the
              description inside the text column). */}
          <div className="hidden md:block">
            <ProductGallery
              images={galleryImages}
              alt={galleryAlt}
            />
          </div>
        </div>
      </section>

      <EphiaHilft />
    </div>
  );
}
