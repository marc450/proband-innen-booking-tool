import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import {
  CERTIFICATE_TEMPLATES,
  certificateRequiresVnr,
} from "@/lib/certificates";
import { CertificateTestForm } from "./certificate-test-form";

export const dynamic = "force-dynamic";

export default async function ZertifikatgeneratorPage() {
  if (!(await isAdmin())) redirect("/dashboard");

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Zertifikatgenerator</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Wähle eine Kursvorlage, gib Name, VNR und ggf. E-Mail ein. Du kannst
          das Zertifikat als PDF herunterladen, in einer neuen Vorschau öffnen
          oder direkt per E-Mail an die Teilnehmer:in versenden.
        </p>
      </div>

      <CertificateTestForm
        templates={CERTIFICATE_TEMPLATES.map((t) => ({
          slug: t.slug,
          label: t.label,
          requiresVnr: certificateRequiresVnr(t),
        }))}
      />
    </div>
  );
}
