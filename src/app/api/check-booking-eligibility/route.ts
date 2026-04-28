import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashEmail, hashPhone } from "@/lib/encryption";
import { findPatientIdByAnyEmail } from "@/lib/contact-emails";

export async function POST(req: NextRequest) {
  try {
    const { email, phone, courseId } = await req.json();

    if (!email && !phone) {
      return NextResponse.json({ eligible: true });
    }

    const supabase = createAdminClient();

    // Check blacklist by email — looks up the patient via primary OR
    // alias so a blacklisted person can't slip through by booking with
    // a non-primary address.
    if (email) {
      const patientId = await findPatientIdByAnyEmail(email);
      if (patientId) {
        const { data: byEmail } = await supabase
          .from("patients")
          .select("patient_status")
          .eq("id", patientId)
          .maybeSingle();
        if (byEmail?.patient_status === "blacklist") {
          return NextResponse.json({ eligible: false, reason: "blacklist" });
        }
      }
    }

    // Check blacklist by phone hash
    if (phone) {
      const normalized = phone.replace(/\D/g, "");
      if (normalized.length >= 7) {
        const phoneH = hashPhone(phone);
        const { data: byPhone } = await supabase
          .from("patients")
          .select("patient_status")
          .eq("phone_hash", phoneH)
          .eq("patient_status", "blacklist")
          .maybeSingle();

        if (byPhone) {
          return NextResponse.json({ eligible: false, reason: "blacklist" });
        }
      }
    }

    // Check if already booked in the same course by email hash
    if (email && courseId) {
      const emailH = hashEmail(email);
      const { data: courseSlots } = await supabase
        .from("slots")
        .select("id")
        .eq("course_id", courseId);

      const slotIds = courseSlots?.map((s) => s.id) ?? [];

      if (slotIds.length > 0) {
        const { data: existing } = await supabase
          .from("bookings")
          .select("id")
          .eq("email_hash", emailH)
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
