import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptPatientFields, encryptBookingFields } from "@/lib/encryption";

export async function POST() {
  const supabase = createAdminClient();
  let patientsMigrated = 0;
  let bookingsMigrated = 0;

  // Migrate patients
  const { data: patients } = await supabase
    .from("patients")
    .select("*")
    .is("encrypted_data", null);

  if (patients) {
    for (const p of patients) {
      if (!p.email) continue;
      const enc = encryptPatientFields({
        email: p.email,
        first_name: p.first_name,
        last_name: p.last_name,
        phone: p.phone,
        address_street: p.address_street,
        address_zip: p.address_zip,
        address_city: p.address_city,
        stripe_customer_id: p.stripe_customer_id,
        notes: p.notes,
      });

      await supabase
        .from("patients")
        .update({
          encrypted_data: enc.encrypted_data,
          encrypted_key: enc.encrypted_key,
          encryption_iv: enc.encryption_iv,
          email_hash: enc.email_hash,
          phone_hash: enc.phone_hash,
        })
        .eq("id", p.id);

      patientsMigrated++;
    }
  }

  // Migrate bookings
  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .is("encrypted_data", null);

  if (bookings) {
    for (const b of bookings) {
      if (!b.email) continue;
      const enc = encryptBookingFields({
        name: b.name || "",
        first_name: b.first_name,
        last_name: b.last_name,
        email: b.email,
        phone: b.phone,
        address_street: b.address_street,
        address_zip: b.address_zip,
        address_city: b.address_city,
        stripe_customer_id: b.stripe_customer_id,
        stripe_payment_method_id: b.stripe_payment_method_id,
      });

      await supabase
        .from("bookings")
        .update({
          encrypted_data: enc.encrypted_data,
          encrypted_key: enc.encrypted_key,
          encryption_iv: enc.encryption_iv,
          email_hash: enc.email_hash,
        })
        .eq("id", b.id);

      bookingsMigrated++;
    }
  }

  return NextResponse.json({
    patientsMigrated,
    bookingsMigrated,
  });
}
