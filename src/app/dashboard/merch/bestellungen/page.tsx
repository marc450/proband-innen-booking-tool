import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccessMerchOrders } from "@/lib/auth";
import type { MerchOrder } from "@/lib/types";
import { OrdersManager, type CompProductOption } from "./orders-manager";

export const dynamic = "force-dynamic";

export default async function MerchBestellungenPage() {
  // Admins + Kursbetreuung (they ship the orders) may view this page.
  if (!(await canAccessMerchOrders())) redirect("/dashboard");

  const admin = createAdminClient();
  const [{ data: orders }, { data: products }] = await Promise.all([
    admin
      .from("merch_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500),
    // Active products + their variants for the "Geschenk-Bestellung" picker.
    // We include sold-out variants in the data and grey them out in the UI
    // so staff sees why a size is unavailable.
    admin
      .from("merch_products")
      .select(
        "id, title, slug, is_active, merch_product_variants(id, name, color, size, stock)",
      )
      .eq("is_active", true)
      .order("title", { ascending: true }),
  ]);

  const compProducts: CompProductOption[] = (products ?? []).map((p) => ({
    id: p.id as string,
    title: p.title as string,
    variants: (
      (p.merch_product_variants as Array<{
        id: string;
        name: string | null;
        color: string | null;
        size: string | null;
        stock: number;
      }>) ?? []
    ).map((v) => ({
      id: v.id,
      name: v.name,
      color: v.color,
      size: v.size,
      stock: v.stock,
    })),
  }));

  return (
    <OrdersManager
      initialOrders={(orders ?? []) as MerchOrder[]}
      compProducts={compProducts}
    />
  );
}
