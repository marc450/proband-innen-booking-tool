import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import {
  CERTIFICATE_TEMPLATES,
  certificateRequiresVnr,
} from "@/lib/certificates";
import { CertificateTestForm } from "./certificate-test-form";
import { CertCronDryRun } from "./cert-cron-dryrun";

export const dynamic = "force-dynamic";

export default async function ZertifikateTestPage() {
  if (!(await isAdmin())) redirect("/dashboard");

  // Default the dry-run picker to tomorrow's expected praxis day so the
  // common "what will the cron send tonight?" check is one click away.
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() - 1);
  const defaultDryRunDate = tomorrow.toISOString().slice(0, 10);

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Zertifikate</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manueller Test der Zertifikats-Generierung. Wähle eine Kursvorlage,
          gib Name und E-Mail ein, und das Zertifikat wird mit pdf-lib erstellt
          und entweder direkt heruntergeladen oder per E-Mail verschickt.
        </p>
      </div>

      <CertificateTestForm
        templates={CERTIFICATE_TEMPLATES.map((t) => ({
          slug: t.slug,
          label: t.label,
          requiresVnr: certificateRequiresVnr(t),
        }))}
      />

      <div>
        <h2 className="text-lg font-bold">Cron Dry-Run</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Simuliert den 24h-Cron für einen Kurstermin und zeigt pro Buchung,
          welches Zertifikat versendet würde — ohne tatsächlich zu senden.
        </p>
        <CertCronDryRun defaultDate={defaultDryRunDate} />
      </div>
    </div>
  );
}
