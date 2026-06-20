"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download } from "lucide-react";

export interface ConsentAuditRow {
  id: string;
  partner: string;
  name: string;
  email: string;
  courseTitle: string;
  courseDate: string;
  consentedAt: string | null;
  revokedAt: string | null;
  exportedAt: string | null;
  withdrawalForwardedAt: string | null;
  hasPdf: boolean;
}

type Filter = "all" | "consented" | "exported" | "revoked";

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Berlin",
  });
}

function statusOf(r: ConsentAuditRow): { label: string; cls: string } {
  if (r.revokedAt)
    return { label: "Widerrufen", cls: "text-red-700 border-red-300 bg-red-50" };
  if (r.exportedAt)
    return { label: "Exportiert", cls: "text-[#0066FF] border-[#0066FF]/30 bg-[#0066FF]/5" };
  return { label: "Eingewilligt", cls: "text-emerald-700 border-emerald-300 bg-emerald-50" };
}

export function PartnerConsentsManager({ rows }: { rows: ConsentAuditRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => {
      if (filter === "revoked") return !!r.revokedAt;
      if (filter === "exported") return !!r.exportedAt && !r.revokedAt;
      if (filter === "consented") return !r.exportedAt && !r.revokedAt;
      return true;
    });
  }, [rows, filter]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      consented: rows.filter((r) => !r.exportedAt && !r.revokedAt).length,
      exported: rows.filter((r) => !!r.exportedAt && !r.revokedAt).length,
      revoked: rows.filter((r) => !!r.revokedAt).length,
    }),
    [rows],
  );

  const tabs: Array<{ key: Filter; label: string }> = [
    { key: "all", label: `Alle (${counts.all})` },
    { key: "consented", label: `Eingewilligt (${counts.consented})` },
    { key: "exported", label: `Exportiert (${counts.exported})` },
    { key: "revoked", label: `Widerrufen (${counts.revoked})` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Galderma-Einwilligungen</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Audit der Datenweitergabe-Einwilligungen. Status, Zeitstempel und die
          unterschriebene Einwilligung pro Teilnehmer:in.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
              filter === t.key
                ? "bg-[#0066FF] text-white"
                : "bg-muted text-foreground hover:bg-muted/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <section className="rounded-[10px] bg-card ring-1 ring-black/5 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="px-6 py-6 text-sm text-muted-foreground">
            Keine Einträge.
          </p>
        ) : (
          <Table containerClassName="overflow-x-auto">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>E-Mail</TableHead>
                <TableHead>Kurs</TableHead>
                <TableHead>Eingewilligt</TableHead>
                <TableHead>Exportiert</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Unterschrift</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const status = statusOf(r);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-sm">{r.email}</TableCell>
                    <TableCell className="text-sm">
                      {r.courseTitle}
                      {r.courseDate ? ` (${r.courseDate})` : ""}
                    </TableCell>
                    <TableCell className="text-sm">{fmt(r.consentedAt)}</TableCell>
                    <TableCell className="text-sm">
                      {fmt(r.exportedAt)}
                      {r.revokedAt && (
                        <span className="block text-xs text-red-600">
                          widerrufen {fmt(r.revokedAt)}
                          {r.withdrawalForwardedAt ? ", an Galderma gemeldet" : ""}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={status.cls}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.hasPdf ? (
                        <a
                          href={`/api/partner-consent/pdf?id=${r.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-[#0066FF] hover:underline"
                        >
                          <Download className="h-3.5 w-3.5" />
                          PDF
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
