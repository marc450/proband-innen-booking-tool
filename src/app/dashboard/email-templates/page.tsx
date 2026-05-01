import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { EmailTemplatesManager } from "./email-templates-manager";

export const dynamic = "force-dynamic";

export default async function EmailTemplatesPage() {
  if (!(await isAdmin())) redirect("/dashboard");

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">E-Mail Vorlagen</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Wiederverwendbare Vorlagen für die Inbox. Speichere Antworten,
          die Du regelmäßig brauchst, und füge sie beim Verfassen einer
          neuen E-Mail mit einem Klick ein.
        </p>
      </div>
      <EmailTemplatesManager />
    </div>
  );
}
