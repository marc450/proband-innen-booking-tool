import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import {
  CERTIFICATE_TEMPLATES,
  certificateRequiresVnr,
} from "@/lib/certificates";
import { CertificateTestForm } from "./certificate-test-form";

export const dynamic = "force-dynamic";

export default async function ZertifikateTestPage() {
  if (!(await isAdmin())) redirect("/dashboard");

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Zertifikate</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manueller Test der Zertifikats-Generierung. Wähle eine Kursvorlage,
          gib Name und E-Mail ein, und das Zertifikat wird mit pdf-lib erstellt
          und entweder direkt heruntergeladen oder per E-Mail verschickt. Die
          automatisierte Versendung 24h nach dem Kurs folgt später.
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
