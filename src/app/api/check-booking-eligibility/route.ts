import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const { email, phone, courseId } = await req.json();

    if (!email && !phone) {
      return NextResponse.json({ eligible: true });
    }

    const supabase = await createClient();

    // Check blacklist by email
    if (email) {
      const { data: byEmail } = await supabase
        .from("patients")
        .select("patient_status")
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();

      if (byEmail?.patient_status === "blacklist") {
        return NextResponse.json({ eligible: false, reason: "blacklist" });
      }
    }

    // Check blacklist by phone
    if (phone) {
      const normalized = normalizePhone(phone.trim());
      if (normalized.length >= 7) {
        const { data: blacklisted } = await supabase
          .from("patients")
          .select("phone")
          .eq("patient_status", "blacklist")
          .not("phone", "is", null);

        const match = blacklisted?.find(
          (p) => p.phone && normalizePhone(p.phone) === normalized
        );

        if (match) {
          return NextResponse.json({ eligible: false, reason: "blacklist" });
        }
      }
    }

    // Check if already booked in the same course
    if (email && courseId) {
      // Get all slot IDs for this course
      const { data: courseSlots } = await supabase
        .from("slots")
        .select("id")
        .eq("course_id", courseId);

      const slotIds = courseSlots?.map((s) => s.id) ?? [];

      if (slotIds.length > 0) {
        const { data: existing } = await supabase
          .from("bookings")
          .select("id")
          .eq("email", email.toLowerCase().trim())
          .in("slot_id", slotIds)
          .in("status", ["booked", "attended"])
          .maybeSingle();

        if (existing) {
          return NextResponse.json({ eligible: false, reason: "already_booked" });
        }
      }
    }

    return NextResponse.json({ eligible: true });
  } catch {
    return NextResponse.json({ eligible: true });
  }
}
