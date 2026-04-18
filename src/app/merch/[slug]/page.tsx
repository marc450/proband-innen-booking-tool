import { createClient } from "@/lib/supabase/server";
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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("merch_products")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!product) notFound();
  const p = product as MerchProduct;

  const { data: variantsData } = await supabase
    .from("merch_product_variants")
    .select("*")
    .eq("product_id", p.id)
    .eq("is_active", true)
    .order("sort_order");

  const variants = (variantsData ?? []) as MerchProductVariant[];

  return (
    <div className="min-h-screen bg-[#FAEBE1]">
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
            {p.description && (
              <p className="mt-5 text-base md:text-lg text-black/75 leading-relaxed max-w-xl">
                {/* Short teaser only — full description lives below. */}
                {p.description.split(". ").slice(0, 2).join(". ")}
                {p.description.split(". ").length > 2 ? "." : ""}
              </p>
            )}

            <div className="mt-8 space-y-3 max-w-md">
              {variants.length === 0 ? (
                <p className="text-sm text-black/60">Keine Varianten verfügbar.</p>
              ) : (
                variants.map((v) => (
                  <MerchCheckoutLauncher
                    key={v.id}
                    variantId={v.id}
                    productTitle={p.title}
                    variantLabel={v.color || v.name}
                    priceCents={v.price_gross_cents}
                    stock={v.stock}
                  />
                ))
              )}
            </div>
          </div>

          {/* Product image(s) */}
          <div className="relative">
            {p.image_url ? (
              <div className="relative aspect-square bg-white rounded-[10px] overflow-hidden">
                <Image
                  src={p.image_url}
                  alt={p.title}
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
