import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptPatient } from "@/lib/encryption";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "admin") return user;
  return null;
}

export type ContactSearchResult = {
  id: string;
  source: "auszubildende" | "patient";
  contactType: "auszubildende" | "proband" | "other" | "company";
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  companyName: string | null;
  title: string | null;
};

// Unified contact search for the invoice dialog. Returns results from both
// the auszubildende table (plaintext, searchable in SQL) and the patients
// table (E2EE — fetched wholesale and filtered in-memory after decryption).
// The endpoint is admin-only; in a small-clinic dataset the patients decrypt
// cost is acceptable and mirrors how the patients list page already works.
export async function GET(req: NextRequest) {
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") || 25), 50);

  if (q.length < 2) {
    return NextResponse.json([]);
  }

  const admin = createAdminClient();
  const qLower = q.toLowerCase();
  const results: ContactSearchResult[] = [];

  // 1. Auszubildende (plaintext): server-side ilike search on a few columns
  try {
    const like = `%${q}%`;
    const { data: rows } = await admin
      .from("auszubildende")
      .select("id, first_name, last_name, email, phone, title, contact_type, company_name")
      .or(
        [
          `first_name.ilike.${like}`,
          `last_name.ilike.${like}`,
          `email.ilike.${like}`,
          `company_name.ilike.${like}`,
        ].join(",")
      )
      .limit(limit);

    for (const r of rows ?? []) {
      results.push({
        id: r.id,
        source: "auszubildende",
        contactType: (r.contact_type as ContactSearchResult["contactType"]) || "auszubildende",
        firstName: r.first_name,
        lastName: r.last_name,
        email: r.email,
        phone: r.phone,
        companyName: r.company_name ?? null,
        title: r.title,
      });
    }
  } catch (err) {
    console.error("Auszubildende search failed:", err);
  }

  // 2. Patients (E2EE): fetch all rows, decrypt, then filter in-memory.
  try {
    const { data: patientRows } = await admin
      .from("patients")
      .select("id, encrypted_data, encrypted_key, encryption_iv, patient_status, created_at, updated_at")
      .eq("patient_status", "active");

    for (const row of patientRows ?? []) {
      let p;
      try {
        p = decryptPatient(row);
      } catch {
        continue;
      }
      const haystack = [
        p.first_name || "",
        p.last_name || "",
        p.email || "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(qLower)) continue;

      results.push({
        id: p.id,
        source: "patient",
        contactType: "proband",
        firstName: p.first_name,
        lastName: p.last_name,
        email: p.email,
        phone: p.phone,
        companyName: null,
        title: null,
      });
      if (results.length >= limit * 2) break;
    }
  } catch (err) {
    console.error("Patient search failed:", err);
  }

  // Sort: exact email matches first, then last-name matches, then the rest
  results.sort((a, b) => {
    const aEmail = a.email?.toLowerCase() === qLower ? 0 : 1;
    const bEmail = b.email?.toLowerCase() === qLower ? 0 : 1;
    if (aEmail !== bEmail) return aEmail - bEmail;
    return (a.lastName || "").localeCompare(b.lastName || "");
  });

  return NextResponse.json(results.slice(0, limit));
}
