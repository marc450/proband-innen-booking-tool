import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVerifiedStaff } from "@/lib/auth-verify";

export async function POST(req: NextRequest) {
  // Verified staff/admin gate — validates the session, never the
  // forgeable x-user-role cookie. This route uses the service-role
  // client (bypasses RLS) and is called only from the staff dashboard.
  const access = await requireVerifiedStaff();
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const { patientId } = await req.json();

    if (!patientId) {
      return NextResponse.json({ error: "Patient ID required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Delete all bookings for this patient first
    await supabase
      .from("bookings")
      .delete()
      .eq("patient_id", patientId);

    // Delete the patient
    const { error } = await supabase
      .from("patients")
      .delete()
      .eq("id", patientId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete patient error:", err);
    return NextResponse.json({ error: "Fehler beim Löschen" }, { status: 500 });
  }
}
