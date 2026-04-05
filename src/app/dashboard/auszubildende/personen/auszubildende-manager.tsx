"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Auszubildende } from "@/lib/types";

const typeLabel = (t: Auszubildende["contact_type"]): string => {
  switch (t) {
    case "company":
      return "Firma";
    case "proband":
      return "Proband:in";
    case "other":
      return "Sonstige";
    case "auszubildende":
    default:
      return "Auszubildende:r";
  }
};

interface Props {
  initialAuszubildende: Auszubildende[];
  bookingCounts: Record<string, number>;
  // Determines page title / count label. Actual row filtering by
  // contact_type happens server-side in page.tsx.
  scope?: "auszubildende" | "other";
}

export function AuszubildendeManager({
  initialAuszubildende,
  bookingCounts,
  scope = "auszubildende",
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const pageTitle = scope === "other" ? "Sonstige Kontakte" : "Auszubildende";
  const countLabel =
    scope === "other"
      ? `${initialAuszubildende.length} Kontakte`
      : `${initialAuszubildende.length} Auszubildende`;

  const filtered = initialAuszubildende.filter((a) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      a.first_name?.toLowerCase().includes(s) ||
      a.last_name?.toLowerCase().includes(s) ||
      a.email?.toLowerCase().includes(s) ||
      a.phone?.toLowerCase().includes(s) ||
      a.company_name?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{pageTitle}</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {search ? `${filtered.length} / ${countLabel}` : countLabel}
          </span>
          <Input
            placeholder="Name, E-Mail oder Telefon suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Typ</TableHead>
            <TableHead>E-Mail</TableHead>
            <TableHead>Telefon</TableHead>
            <TableHead className="text-center">Buchungen</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                {search ? "Keine Einträge gefunden." : "Noch keine Einträge vorhanden."}
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((azubi) => {
              const personName = [azubi.first_name, azubi.last_name].filter(Boolean).join(" ");
              const isCompany = azubi.contact_type === "company";
              const displayName = isCompany
                ? azubi.company_name || personName || "–"
                : personName || azubi.company_name || "–";
              const count = bookingCounts[azubi.id] || 0;
              return (
                <TableRow key={azubi.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/dashboard/auszubildende/personen/${azubi.id}`)}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/dashboard/auszubildende/personen/${azubi.id}`}
                      className="text-primary hover:underline"
                    >
                      {displayName}
                    </Link>
                    {!isCompany && azubi.company_name && (
                      <div className="text-xs text-muted-foreground">{azubi.company_name}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {typeLabel(azubi.contact_type)}
                    </Badge>
                  </TableCell>
                  <TableCell>{azubi.email}</TableCell>
                  <TableCell>{azubi.phone || "–"}</TableCell>
                  <TableCell className="text-center">{count}</TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${
                      azubi.status === "active"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {azubi.status === "active" ? "Aktiv" : "Inaktiv"}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
