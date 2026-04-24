import Link from "next/link";
import { redirect } from "next/navigation";
import {
  FUNNEL_LABELS,
  groupTransactionalEmails,
} from "@/lib/transactional-emails";
import { isAdmin } from "@/lib/auth";
import { Mail } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TransactionalEmailsPage() {
  if (!(await isAdmin())) redirect("/dashboard");
  const groups = groupTransactionalEmails();
  const total = groups.reduce((n, g) => n + g.emails.length, 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Transaktionale E-Mails</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Übersicht über alle {total} automatisierten E-Mails, die das Tool
          aktuell versendet. Klicke eine E-Mail an, um eine Vorschau mit
          Beispiel-Daten zu sehen. Änderungen am Inhalt erfolgen über den Code
          (Claude Code), nicht in diesem Dashboard.
        </p>
      </div>

      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.funnel}>
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">
              {FUNNEL_LABELS[group.funnel]}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {group.emails.map((email) => (
                <Link
                  key={email.id}
                  href={`/dashboard/transactional-emails/${email.id}`}
                  className="group block bg-white rounded-[10px] p-4 shadow-sm ring-1 ring-black/5 hover:ring-[#0066FF]/30 transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-full bg-[#0066FF]/10 text-[#0066FF] flex items-center justify-center flex-shrink-0">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {email.name}
                        </h3>
                        <span className="text-[10px] font-semibold uppercase tracking-wide rounded-full bg-gray-100 text-gray-700 px-2 py-0.5">
                          {email.recipient}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {email.description}
                      </p>
                      <p className="text-[11px] text-muted-foreground/80 mt-2">
                        <span className="font-medium">Trigger:</span>{" "}
                        {email.trigger}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
