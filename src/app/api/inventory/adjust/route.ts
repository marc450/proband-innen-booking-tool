import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVerifiedStaff } from "@/lib/auth-verify";

// Adjust the stock of a single inventory item. Verified-staff gate (admin or
// nutzer) — every staff user may update inventory. The mutation runs through
// the apply_inventory_change RPC, which updates the item and writes an
// immutable inventory_changes row in one transaction, attributing the change
// to the verified caller.
export async function POST(req: NextRequest) {
  const access = await requireVerifiedStaff();
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { itemId, newQuantity, note } = await req.json();

  if (
    !itemId ||
    typeof newQuantity !== "number" ||
    !Number.isInteger(newQuantity) ||
    newQuantity < 0
  ) {
    return NextResponse.json(
      { error: "itemId und eine gültige newQuantity (>= 0) sind erforderlich." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("apply_inventory_change", {
    p_item_id: itemId,
    p_new_quantity: newQuantity,
    p_note: typeof note === "string" ? note : null,
    p_user_id: access.userId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // data is the new inventory_changes.id, or null when the quantity was
  // unchanged (no history row written).
  return NextResponse.json({ ok: true, changeId: data, changed: data !== null });
}
