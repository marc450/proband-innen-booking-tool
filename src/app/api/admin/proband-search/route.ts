import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptPatient } from "@/lib/encryption";
import { requireVerifiedStaff } from "@/lib/auth-verify";

export type ProbandSearchResult = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
};

// Proband:innen-Typeahead für den Nachbehandlungs-Flow im Kurs-Detail.
//
// Warum ein eigener Endpoint statt /api/admin/contact-search: contact-search
// ist admin-only (role === 'admin') und liefert zusätzlich Auszubildende-PII.
// Dozent:innen sind 'nutzer' und brauchen nur Proband:innen. Deshalb hier ein
// fokussierter, staff-gated (admin ODER nutzer) Endpoint, der ausschließlich
// aktive patients zurückgibt.
//
// patients sind E2EE: es gibt keinen SQL-Suchindex, also alle aktiven Zeilen
// laden, entschlüsseln und in-memory filtern. Kostenmäßig identisch zur
// bestehenden Patients-Liste und zu contact-search (Klein-Klinik-Datensatz).
export async function GET(req: NextRequest) {
  const access = await requireVerifiedStaff();
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") || 10), 25);

  if (q.length < 2) {
    return NextResponse.json([]);
  }

  const admin = createAdminClient();
  const qLower = q.toLowerCase();
  const results: ProbandSearchResult[] = [];

  try {
    const { data: patientRows } = await admin
      .from("patients")
      .select("id, encrypted_data, encrypted_key, encryption_iv, patient_status")
      .eq("patient_status", "active");

    for (const row of patientRows ?? []) {
      let p;
      try {
        p = decryptPatient(row);
      } catch {
        continue;
      }
      const haystack = [p.first_name || "", p.last_name || "", p.email || ""]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(qLower)) continue;

      results.push({
        id: p.id,
        firstName: p.first_name,
        lastName: p.last_name,
        email: p.email,
        phone: p.phone,
      });
      if (results.length >= limit * 2) break;
    }
  } catch (err) {
    console.error("Proband search failed:", err);
  }

  // Exakte E-Mail-Treffer zuerst, dann nach Nachname.
  results.sort((a, b) => {
    const aEmail = a.email?.toLowerCase() === qLower ? 0 : 1;
    const bEmail = b.email?.toLowerCase() === qLower ? 0 : 1;
    if (aEmail !== bEmail) return aEmail - bEmail;
    return (a.lastName || "").localeCompare(b.lastName || "");
  });

  return NextResponse.json(results.slice(0, limit));
}
