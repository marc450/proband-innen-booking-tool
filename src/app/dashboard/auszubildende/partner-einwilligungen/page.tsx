import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { PartnerConsentsManager, type ConsentAuditRow } from "./consents-manager";

export const dynamic = "force-dynamic";

export default async function PartnerEinwilligungenPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("x-user-role")?.value;
  if (role !== "admin" && role !== "nutzer") redirect("/login");

  const admin = createAdminClient();
  const { data } = await admin
    .from("partner_data_consents")
    .select(
      "id, partner, consented_at, revoked_at, exported_at, withdrawal_forwarded_at, source, signed_payload, signature_storage_path",
    )
    .order("consented_at", { ascending: false, nullsFirst: false });

  const rows: ConsentAuditRow[] = (data ?? []).map((r) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = (r.signed_payload as any) ?? {};
    return {
      id: r.id as string,
      partner: (r.partner as string) ?? "galderma",
      name: [p.first_name, p.last_name].filter(Boolean).join(" ") || "—",
      email: p.email ?? "—",
      courseTitle: p.course_title ?? "—",
      courseDate: p.course_date ?? "",
      consentedAt: (r.consented_at as string | null) ?? null,
      revokedAt: (r.revoked_at as string | null) ?? null,
      exportedAt: (r.exported_at as string | null) ?? null,
      withdrawalForwardedAt: (r.withdrawal_forwarded_at as string | null) ?? null,
      hasPdf: !!(r.signature_storage_path as string | null),
    };
  });

  return <PartnerConsentsManager rows={rows} />;
}
