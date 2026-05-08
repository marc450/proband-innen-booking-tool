import Link from "next/link";

export default async function KursDetailPlaceholderPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/kurse"
        className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      >
        ← Zurück zur Übersicht
      </Link>
      <div className="rounded-[10px] bg-card p-8 ring-1 ring-black/5">
        <h1 className="text-xl font-bold">Detailseite folgt</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Hier kommt die Detailansicht für Session{" "}
          <code className="text-xs font-mono">{sessionId.slice(0, 8)}</code>:
          editierbare Session-Felder, Auszubildende-Buchungen, Proband:innen-Slots
          mit Buchungen + Notizen.
        </p>
      </div>
    </div>
  );
}
