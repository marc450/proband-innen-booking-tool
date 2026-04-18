import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import type { MerchProduct, MerchProductVariant } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "EPHIA Merch",
  description: "Merch von EPHIA. Mit jeder Cap unterstützen wir die Jenny De la Torre-Stiftung.",
};

export default async function MerchIndexPage() {
  const supabase = await createClient();

  // Fetch active products and all their variants in one round trip. The
  // product page itself only shows a product tile when at least one
  // variant still has stock, so we filter in-memory rather than adding a
  // second query.
  const [{ data: products }, { data: variants }] = await Promise.all([
    supabase.from("merch_products").select("*").eq("is_active", true).order("created_at"),
    supabase.from("merch_product_variants").select("*").eq("is_active", true).order("sort_order"),
  ]);

  const productList = (products ?? []) as MerchProduct[];
  const variantList = (variants ?? []) as MerchProductVariant[];

  const byProduct = new Map<string, MerchProductVariant[]>();
  for (const v of variantList) {
    if (!byProduct.has(v.product_id)) byProduct.set(v.product_id, []);
    byProduct.get(v.product_id)!.push(v);
  }

  return (
    <div className="min-h-screen bg-[#FAEBE1]">
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-20">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold">EPHIA Merch</h1>
          <p className="mt-3 text-black/70 max-w-2xl mx-auto">
            Mit jedem Stück unterstützt Du unsere Mission für evidenzbasierte,
            patient:innenzentrierte Behandlungen.
          </p>
        </div>

        {productList.length === 0 ? (
          <div className="bg-white rounded-[10px] p-10 text-center">
            <p className="text-black/70">Aktuell keine Produkte verfügbar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {productList.map((p) => {
              const vs = byProduct.get(p.id) ?? [];
              const hasStock = vs.some((v) => v.stock > 0);
              const minPrice = vs.length
                ? Math.min(...vs.map((v) => v.price_gross_cents))
                : 0;
              return (
                <Link
                  key={p.id}
                  href={`/merch/${p.slug}`}
                  className="bg-white rounded-[10px] overflow-hidden flex flex-col group transition-shadow hover:shadow-lg"
                >
                  {p.image_url ? (
                    <div className="relative aspect-[4/3] bg-black/5 overflow-hidden">
                      <Image
                        src={p.image_url}
                        alt={p.title}
                        fill
                        quality={85}
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[4/3] flex items-center justify-center bg-black/5" aria-hidden="true">
                      <ImageIcon className="w-12 h-12 text-black/20" />
                    </div>
                  )}
                  <div className="p-5 flex-1 flex flex-col">
                    {p.subtitle && (
                      <p className="text-xs font-bold tracking-wider text-[#0066FF] uppercase mb-1">
                        {p.subtitle.replace(/"/g, "")}
                      </p>
                    )}
                    <h2 className="text-xl font-bold">{p.title}</h2>
                    <div className="mt-auto pt-4 flex items-center justify-between">
                      <span className="text-lg font-semibold">
                        {(minPrice / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                      </span>
                      {hasStock ? (
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
