import { createAdminClient } from "@/lib/supabase/admin";
import type { MerchProduct, MerchProductVariant } from "@/lib/types";
import { ProductsManager } from "./products-manager";

export const dynamic = "force-dynamic";

export default async function MerchProduktePage() {
  const admin = createAdminClient();
  const [{ data: products }, { data: variants }] = await Promise.all([
    admin.from("merch_products").select("*").order("created_at"),
    admin.from("merch_product_variants").select("*").order("sort_order"),
  ]);

  return (
    <ProductsManager
      initialProducts={(products ?? []) as MerchProduct[]}
      initialVariants={(variants ?? []) as MerchProductVariant[]}
    />
  );
}
