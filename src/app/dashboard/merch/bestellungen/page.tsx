import { createAdminClient } from "@/lib/supabase/admin";
import type { MerchOrder } from "@/lib/types";
import { OrdersManager } from "./orders-manager";

export const dynamic = "force-dynamic";

export default async function MerchBestellungenPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("merch_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  return <OrdersManager initialOrders={(data ?? []) as MerchOrder[]} />;
}
