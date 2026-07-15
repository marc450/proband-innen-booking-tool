"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Badge } from "@/components/ui/badge";
import { ChevronRight, Plus } from "lucide-react";
import { NewContactModal } from "@/components/new-contact-modal";
import { TableHeaderBar } from "@/components/table/table-header-bar";
import { SortableHead } from "@/components/table/sortable-head";
import { useTableSort } from "@/hooks/use-table-sort";
import type { Auszubildende } from "@/lib/types";

type SortKey = "last_name" | "first_name" | "email" | "status" | "created_at";

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
      return "Ärzt:in";
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
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  // In the "other" scope we mix Firma + Sonstige contacts; a type filter
  // lets the user split them. In the auszubildende scope it's always
  // auszubildende so we hide the filter there.
  const [typeFilter, setTypeFilter] = useState<"all" | "company" | "other">("all");
  const { sortKey, sortDir, handleSort } = useTableSort<SortKey>("first_name", "asc");

  // Group contacts that share the same (lowercased) first+last name.
  // The primary motivation is the "same human, multiple emails"
  // pattern (e.g. Annett Güldner with @web.de and @gmx.de) — each
  // address creates its own LW user and her purchases get split.
  // Surfacing a "möglicher Duplikat (N)"-Pill on the row gives staff
  // a fast visual cue to investigate before the customer complains.
  // Empty-name contacts are excluded so the import-from-Stripe rows
  // (no name yet) don't all collapse into one giant "duplicate" group.
  const duplicateGroups = useMemo(() => {
    const map = new Map<string, Auszubildende[]>();
    for (const a of initialAuszubildende) {
      const fn = (a.first_name ?? "").trim().toLowerCase();
      const ln = (a.last_name ?? "").trim().toLowerCase();
      if (!fn || !ln) continue;
      const key = `${fn}|${ln}`;
      const arr = map.get(key);
      if (arr) arr.push(a);
      else map.set(key, [a]);
    }
    for (const [key, members] of map) {
      if (members.length < 2) map.delete(key);
    }
    return map;
  }, [initialAuszubildende]);

  const findDuplicateGroup = (azubi: Auszubildende): Auszubildende[] | null => {
    const fn = (azubi.first_name ?? "").trim().toLowerCase();
    const ln = (azubi.last_name ?? "").trim().toLowerCase();
    if (!fn || !ln) return null;
    const group = duplicateGroups.get(`${fn}|${ln}`);
    return group && group.length > 1 ? group : null;
  };
  const [newContactOpen, setNewContactOpen] = useState(false);
  const [prefillEmail, setPrefillEmail] = useState<string | null>(null);
  const [prefillFirstName, setPrefillFirstName] = useState<string | null>(null);
  const [prefillLastName, setPrefillLastName] = useState<string | null>(null);

  // Deep-link from the inbox sidebar: /…?newEmail=foo@bar.de auto-opens
  // the NewContactModal with the address pre-filled, so clicking "Als
  // Ärzt:in anlegen" lands you straight in the create flow with the
  // sender's email already in the field. The param is stripped from the
  // URL after consumption so a back-button trip doesn't re-trigger.
  const searchParams = useSearchParams();
  const pathname = usePathname();
  useEffect(() => {
    const newEmail = searchParams?.get("newEmail");
    if (!newEmail) return;
    // Consuming one-shot URL params on mount legitimately requires
    // seeding state here; the compiler rule's flag is a false positive.
    /* eslint-disable react-hooks/set-state-in-effect */
    setPrefillEmail(newEmail);
    setPrefillFirstName(searchParams.get("newFirstName"));
    setPrefillLastName(searchParams.get("newLastName"));
    setNewContactOpen(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    const next = new URLSearchParams(searchParams.toString());
    next.delete("newEmail");
    next.delete("newFirstName");
    next.delete("newLastName");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
    // searchParams + pathname are stable identities across renders; we
    // only want this to run on initial mount + URL changes.
  }, [searchParams, pathname, router]);

  const pageTitle = scope === "other" ? "Sonstige Kontakte" : "Ärzt:innen";
  const countLabel = scope === "other" ? "Kontakte" : "Ärzt:innen";

  const filtered = initialAuszubildende
    .filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (scope === "other" && typeFilter !== "all" && a.contact_type !== typeFilter) return false;
      if (!search.trim()) return true;
      // Tokenise the query so typing both "Ahmad Al-Masri" matches a
      // row where "Ahmad" is in first_name and "Al-Masri" is in
      // last_name. Every token must appear somewhere in the combined
      // haystack; single-word searches still work because the loop has
      // one iteration.
      const haystack = [
        a.first_name,
        a.last_name,
        a.email,
        a.phone,
        a.company_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const tokens = search.toLowerCase().trim().split(/\s+/);
      return tokens.every((t) => haystack.includes(t));
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const nameOf = (x: Auszubildende) => {
        const person = [x.first_name, x.last_name].filter(Boolean).join(" ");
        return (x.contact_type === "company"
          ? x.company_name || person
          : person || x.company_name || ""
        ).toLowerCase();
      };
      switch (sortKey) {
        case "last_name":
          return (a.last_name || "").localeCompare(b.last_name || "") * dir;
        case "first_name":
          return (a.first_name || "").localeCompare(b.first_name || "") * dir;
        case "email":
          return (a.email || "").localeCompare(b.email || "") * dir;
        case "status":
          return (a.status || "").localeCompare(b.status || "") * dir;
        case "created_at":
          return (a.created_at || "").localeCompare(b.created_at || "") * dir;
      }
    });

  return (
    <div className="space-y-6">
      <TableHeaderBar
        title={pageTitle}
        count={filtered.length}
        countLabel={countLabel}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Name, E-Mail oder Telefon suchen..."
        filters={
          <>
            {scope === "other" && (
              <Select
                value={typeFilter}
                onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}
              >
                <SelectTrigger className="w-[140px] h-9 bg-white border-input/60">
                  <SelectValue placeholder="Typ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Typen</SelectItem>
                  <SelectItem value="company">Firma</SelectItem>
                  <SelectItem value="other">Sonstige</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
            >
              <SelectTrigger className="w-[140px] h-9 bg-white border-input/60">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="active">Aktiv</SelectItem>
                <SelectItem value="inactive">Inaktiv</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        actions={
          <Button
            onClick={() => setNewContactOpen(true)}
            className="h-9 px-3.5 py-0 text-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Neuer Kontakt
          </Button>
        }
      />

      <NewContactModal
        open={newContactOpen}
        onOpenChange={(o) => {
          setNewContactOpen(o);
          if (!o) {
            setPrefillEmail(null);
            setPrefillFirstName(null);
            setPrefillLastName(null);
          }
        }}
        defaultType={scope === "other" ? "other" : "auszubildende"}
        defaultEmail={prefillEmail}
        defaultFirstName={prefillFirstName}
        defaultLastName={prefillLastName}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead label="Vorname" sortKey="first_name" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
            <SortableHead label="Nachname" sortKey="last_name" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
            <SortableHead label="E-Mail" sortKey="email" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
            <TableHead>Telefon</TableHead>
            <TableHead>Ort</TableHead>
            <TableHead>Fachrichtung</TableHead>
            <SortableHead label="Status" sortKey="status" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
            <SortableHead label="Erstellt am" sortKey="created_at" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
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
              const ort = [azubi.address_postal_code, azubi.address_city].filter(Boolean).join(" ");
              const createdAt = new Date(azubi.created_at).toLocaleDateString("de-DE", {
                day: "2-digit", month: "2-digit", year: "numeric",
              });
              return (
                <TableRow
                  key={azubi.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/dashboard/auszubildende/personen/${azubi.id}`)}
                >
                  <TableCell className="font-medium">
                    {isCompany ? (personName || azubi.company_name || "–") : (azubi.first_name || "–")}
                  </TableCell>
                  <TableCell>
                    {isCompany ? (azubi.company_name || azubi.last_name || "–") : (azubi.last_name || "–")}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      {azubi.email}
                      {(() => {
                        const dupes = findDuplicateGroup(azubi);
                        if (!dupes) return null;
                        const others = dupes
                          .filter((d) => d.id !== azubi.id)
                          .map((d) => d.email)
                          .join(", ");
                        return (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-amber-50 text-amber-700 border-amber-200"
                            title={`Gleicher Name wie: ${others}`}
                          >
                            möglicher Duplikat ({dupes.length})
                          </Badge>
                        );
                      })()}
                    </span>
                  </TableCell>
                  <TableCell>{azubi.phone || "–"}</TableCell>
                  <TableCell>{ort || "–"}</TableCell>
                  <TableCell>
                    {(() => {
                      // Show the actual specialty string the Arzt:in entered
                      // (e.g. "Allgemeinmedizin", "Dermatologie"). Zahnmedizin
                      // gets an amber pill so it still stands out at a glance;
                      // everything else is a blue pill. Empty specialty shows
                      // a dash so incomplete profiles remain visible.
                      if (!azubi.specialty) {
                        return <span className="text-xs text-muted-foreground">–</span>;
                      }
                      const isZahn = azubi.specialty === "Zahnmedizin";
                      return (
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            isZahn
                              ? "bg-amber-100 text-amber-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {azubi.specialty}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${
                        azubi.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {azubi.status === "active" ? "Aktiv" : "Inaktiv"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{createdAt}</TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
