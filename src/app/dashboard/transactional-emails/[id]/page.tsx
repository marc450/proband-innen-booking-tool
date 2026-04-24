import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  FUNNEL_LABELS,
  getTransactionalEmailById,
} from "@/lib/transactional-emails";
import { TransactionalEmailPreview } from "../transactional-email-preview";
import { TRANSACTIONAL_EMAILS } from "@/lib/transactional-emails";

export function generateStaticParams() {
  return TRANSACTIONAL_EMAILS.map((e) => ({ id: e.id }));
}

export default async function TransactionalEmailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const email = getTransactionalEmailById(id);
  if (!email) notFound();

  const { subject, html } = email.renderSample();

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link
          href="/dashboard/transactional-emails"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Zurück zur Übersicht
        </Link>
        <div className="mt-3 flex items-start gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">{email.name}</h1>
          <span className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide rounded-full bg-gray-100 text-gray-700 px-2 py-0.5">
            {email.recipient}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {email.description}
        </p>
      </div>

      <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div className="bg-white rounded-[10px] p-4 shadow-sm ring-1 ring-black/5">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Funnel
          </dt>
          <dd className="mt-1 font-medium">{FUNNEL_LABELS[email.funnel]}</dd>
        </div>
        <div className="bg-white rounded-[10px] p-4 shadow-sm ring-1 ring-black/5">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Trigger
          </dt>
          <dd className="mt-1">{email.trigger}</dd>
        </div>
        <div className="bg-white rounded-[10px] p-4 shadow-sm ring-1 ring-black/5">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Betreff (Beispiel)
          </dt>
          <dd className="mt-1 font-mono text-xs">{subject}</dd>
        </div>
        <div className="bg-white rounded-[10px] p-4 shadow-sm ring-1 ring-black/5">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Code
          </dt>
          <dd className="mt-1 font-mono text-xs break-all">{email.codeRef}</dd>
        </div>
      </dl>

      <TransactionalEmailPreview html={html} />
    </div>
  );
}
