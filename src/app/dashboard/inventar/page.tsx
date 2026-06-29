export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  InventoryChange,
  InventoryItem,
  InventoryLocation,
} from "@/lib/types";
import { InventarManager } from "./inventar-manager";

const ITEM_SELECT = `
  id, location_id, product_family, product_name, quantity, sort_order,
  updated_at, updated_by,
  updater:profiles!inventory_items_updated_by_fkey(id, title, first_name, last_name)
`;

const CHANGE_SELECT = `
  id, item_id, location_id, changed_by, quantity_before, quantity_after,
  delta, note, created_at,
  changer:profiles!inventory_changes_changed_by_fkey(id, title, first_name, last_name),
  item:inventory_items!inventory_changes_item_id_fkey(product_family, product_name)
`;

export default async function InventarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || (profile.role !== "admin" && profile.role !== "nutzer")) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();

  const [{ data: locations }, { data: items }, { data: changes }] =
    await Promise.all([
      admin
        .from("inventory_locations")
        .select("id, name, address, created_at")
        .order("name", { ascending: true }),
      admin
        .from("inventory_items")
        .select(ITEM_SELECT)
        .order("product_family", { ascending: true })
        .order("sort_order", { ascending: true }),
      admin
        .from("inventory_changes")
        .select(CHANGE_SELECT)
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);

  return (
    <InventarManager
      locations={(locations ?? []) as InventoryLocation[]}
      initialItems={(items ?? []) as unknown as InventoryItem[]}
      initialChanges={(changes ?? []) as unknown as InventoryChange[]}
    />
  );
}
