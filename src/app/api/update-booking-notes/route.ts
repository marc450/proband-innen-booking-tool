import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptFields, encryptFields } from "@/lib/encryption";

// Updates a per-booking notes field. Mirrors /api/update-patient-notes
// but operates on the bookings table instead of patients. The notes
// field lives inside the booking's encrypted_data blob alongside the
// rest of the PII; we decrypt the row, set notes, and re-encrypt with
// a fresh AES key + IV. Old bookings without a notes field decrypt
// fine — the merged object simply gains the new key on first save.

export async function POST(req: NextRequest) {
  const { bookingId, notes } = await req.json();

  if (!bookingId) {
    return NextResponse.json({ error: "bookingId required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("encrypted_data, encrypted_key, encryption_iv")
    .eq("id", bookingId)
    .single();

  if (!booking?.encrypted_data) {
    return NextResponse.json(
      { error: "Booking not found or not encrypted" },
      { status: 404 },
    );
  }

  const fields = decryptFields<Record<string, unknown>>(
    booking.encrypted_data,
    booking.encrypted_key,
    booking.encryption_iv,
  );

  fields.notes = notes || null;

  const enc = encryptFields(fields);

  const { error } = await supabase
    .from("bookings")
    .update({
      encrypted_data: enc.encrypted_data,
      encrypted_key: enc.encrypted_key,
      encryption_iv: enc.encryption_iv,
    })
    .eq("id", bookingId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
