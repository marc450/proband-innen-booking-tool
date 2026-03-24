import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function normalizePhone(phone: string): string {
  // Strip all non-digit characters for comparison
  return phone.replace(/\D/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const { email, phone } = await req.json();

    if (!email && !phone) {
      return NextResponse.json({ eligible: true });
    }

    const supabase = await createClient();

    // Check by email
    if (email) {
      const { data: byEmail } = await supabase
        .from("patients")
        .select("patient_status")
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();

      if (byEmail?.patient_status === "blacklist") {
        return NextResponse.json({ eligible: false });
      }
    }

    // Check by phone (compare normalized digits only to handle formatting differences)
    if (phone) {
      const normalized = normalizePhone(phone.trim());
      if (normalized.length >= 7) {
        const { data: allWithPhone } = await supabase
          .from("patients")
          .select("patient_status, phone")
          .eq("patient_status", "blacklist")
          .not("phone", "is", null);

        const match = allWithPhone?.find(
          (p) => p.phone && normalizePhone(p.phone) === normalized
        );

        if (match) {
          return NextResponse.json({ eligible: false });
        }
      }
    }

    return NextResponse.json({ eligible: true });
  } catch {
    // On error, allow through — the hard block in confirm-booking will catch it
    return NextResponse.json({ eligible: true });
  }
}
