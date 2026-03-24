import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ eligible: true });
    }

    const supabase = await createClient();

    const { data: patient } = await supabase
      .from("patients")
      .select("patient_status")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (patient?.patient_status === "blacklist") {
      return NextResponse.json({ eligible: false });
    }

    return NextResponse.json({ eligible: true });
  } catch {
    // On error, allow through — the hard block in confirm-booking will catch it
    return NextResponse.json({ eligible: true });
  }
}
