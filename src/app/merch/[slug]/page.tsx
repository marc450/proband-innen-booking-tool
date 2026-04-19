import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import type { MerchProduct, MerchProductVariant } from "@/lib/types";
import { MerchCheckoutLauncher } from "./checkout-launcher";

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
  // we can render a single targeted buy CTA instead of re-showing every
  // colorway. Pick the requested variant; fall back to the first available
  // one (direct navigation to /merch/ephia-cap without a query).
  const selected =
    (requestedColor && variants.find((v) => (v.color || "").toLowerCase() === requestedColor.toLowerCase())) ||
    variants[0] ||
    null;

  const heroImage = selected?.image_url || p.image_url || null;

  return (
    <div>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 pt-16 md:pt-20 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div>
            {p.subtitle && (
              <p className="text-sm font-bold tracking-wider text-[#0066FF] uppercase mb-3">
                {p.subtitle.replace(/"/g, "")}
              </p>
            )}
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">{p.title}</h1>
            {selected?.color && (
              <p className="mt-3 text-sm font-medium text-black/70">
                Farbe: <span className="font-semibold text-black">{selected.color}</span>
              </p>
            )}
            {p.description && (
              /* Renders the full Beschreibung the admin typed in the
                 product dialog. Preserves paragraph breaks the admin
                 inserted with blank lines. */
              <div className="mt-5 text-base md:text-lg text-black/75 leading-relaxed max-w-xl space-y-4">
                {p.description
                  .split(/\n{2,}/)
                  .map((para) => para.trim())
                  .filter(Boolean)
                  .map((para, i) => (
                    <p key={i} className="whitespace-pre-line">
                      {para}
                    </p>
                  ))}
              </div>
            )}

            <div className="mt-8 max-w-md">
              {!selected ? (
                <p className="text-sm text-black/60">Keine Varianten verfügbar.</p>
              ) : (
                <MerchCheckoutLauncher
                  variantId={selected.id}
                  productTitle={p.title}
                  variantLabel={selected.color || selected.name}
                  priceCents={selected.price_gross_cents}
                  stock={selected.stock}
                  buttonText={selected.stock > 0 ? "Jetzt bestellen" : undefined}
                />
              )}
            </div>
          </div>

          {/* Product image */}
          <div className="relative">
            {heroImage ? (
              <div className="relative aspect-square bg-white rounded-[10px] overflow-hidden">
                <Image
                  src={heroImage}
                  alt={selected?.color ? `${p.title} ${selected.color}` : p.title}
                  fill
                  quality={90}
                  sizes="(min-width: 768px) 50vw, 100vw"
                  priority
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="aspect-square bg-white rounded-[10px] flex items-center justify-center">
                <ImageIcon className="w-16 h-16 text-black/20" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Donation / cause block (EPHIA hilft) */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-5 md:px-8 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#0066FF]/10">
            <svg className="w-7 h-7 text-[#0066FF]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.18L12 21z" />
            </svg>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold">EPHIA hilft</h2>
          <div className="text-black/75 text-base md:text-lg leading-relaxed space-y-4 text-left md:text-center">
            <p>
              In Berlin leben mehrere Tausend Menschen ohne festen Wohnsitz. Mit der
              Dauer der Obdachlosigkeit nehmen gesundheitliche Probleme, chronische
              Erkrankungen und soziale Verwahrlosung stetig zu. Für viele Betroffene
              ist der Zugang zum regulären Gesundheitssystem mit hohen Hürden
              verbunden oder faktisch nicht möglich.
            </p>
            <p>
              Deshalb unterstützen wir mit jeder verkauften EPHIA Cap die{" "}
              <a
                href="https://www.delatorre-stiftung.de"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0066FF] underline underline-offset-4"
              >
                Jenny De la Torre-Stiftung
              </a>{" "}
              mit einer Spende in Höhe von 10 €.
            </p>
            <p className="font-semibold">Mit jeder Cap trägst Du dazu bei, diese Arbeit zu unterstützen.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
