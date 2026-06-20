import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GALDERMA_PARTNER } from "@/lib/partner-galderma";

const CONSENT_BUCKET = "partner-consents";

// Staff-only download of a signed consent PDF. Mints a short-lived signed
// URL server-side (the bucket is private) and redirects to it.
async function assertStaff(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile?.role === "admin" || profile?.role === "nutzer";
}

export async function GET(req: NextRequest) {
  if (!(await assertStaff())) {
    return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 });
  }
  const consentId = req.nextUrl.searchParams.get("id");
  if (!consentId) {
    return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("partner_data_consents")
    .select("signature_storage_path")
    .eq("id", consentId)
    .eq("partner", GALDERMA_PARTNER)
    .maybeSingle();

  const path = row?.signature_storage_path as string | null | undefined;
  if (!path) {
    return NextResponse.json({ error: "Keine Unterschrift hinterlegt." }, { status: 404 });
  }

  const { data: signed, error } = await admin.storage
    .from(CONSENT_BUCKET)
    .createSignedUrl(path, 120);
  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: "Download nicht möglich." }, { status: 500 });
  }
  return NextResponse.redirect(signed.signedUrl);
}
