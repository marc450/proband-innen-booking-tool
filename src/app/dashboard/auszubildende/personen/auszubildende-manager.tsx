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
import type { Auszubildende } from "@/lib/types";

interface Props {
  initialAuszubildende: Auszubildende[];
  bookingCounts: Record<string, number>;
}

export function AuszubildendeManager({ initialAuszubildende, bookingCounts }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = initialAuszubildende.filter((a) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      a.first_name?.toLowerCase().includes(s) ||
      a.last_name?.toLowerCase().includes(s) ||
      a.email?.toLowerCase().includes(s) ||
      a.phone?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Auszubildende</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{filtered.length} Auszubildende</span>
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
            <TableHead>E-Mail</TableHead>
            <TableHead>Telefon</TableHead>
            <TableHead className="text-center">Buchungen</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                {search ? "Keine Auszubildenden gefunden." : "Noch keine Auszubildenden vorhanden."}
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((azubi) => {
              const name = [azubi.first_name, azubi.last_name].filter(Boolean).join(" ") || "–";
              const count = bookingCounts[azubi.id] || 0;
              return (
                <TableRow key={azubi.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/dashboard/auszubildende/personen/${azubi.id}`)}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/dashboard/auszubildende/personen/${azubi.id}`}
                      className="text-primary hover:underline"
                    >
                      {name}
                    </Link>
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
