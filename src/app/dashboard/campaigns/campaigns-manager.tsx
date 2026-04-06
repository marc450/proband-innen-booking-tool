"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EmailCampaign, CampaignStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Plus, ArrowUpDown, Search } from "lucide-react";

const statusLabels: Record<CampaignStatus, string> = {
  draft: "In Bearbeitung",
  scheduled: "Geplant",
  sending: "Wird gesendet",
  sent: "Gesendet",
  failed: "Fehlgeschlagen",
};

const statusVariants: Record<CampaignStatus, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  scheduled: "secondary",
  sending: "secondary",
  sent: "default",
  failed: "destructive",
};

type SortKey = "name" | "status" | "recipients" | "created" | "sent";
type SortDir = "asc" | "desc";
type StatusFilter = "all" | CampaignStatus;

interface Props {
  campaigns: EmailCampaign[];
}

function formatDateShort(dateStr: string) {
  return format(new Date(dateStr), "dd.MM.yyyy HH:mm", { locale: de });
}

export function CampaignsManager({ campaigns }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    let result = campaigns;

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.subject.toLowerCase().includes(q)
      );
    }

    // Sort
    const dir = sortDir === "asc" ? 1 : -1;
    result = [...result].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return (a.name || "").localeCompare(b.name || "") * dir;
        case "status":
          return a.status.localeCompare(b.status) * dir;
        case "recipients":
          return ((a.recipient_count || 0) - (b.recipient_count || 0)) * dir;
        case "created":
          return a.created_at.localeCompare(b.created_at) * dir;
        case "sent":
          return (a.sent_at || "").localeCompare(b.sent_at || "") * dir;
        default:
          return 0;
      }
    });

    return result;
  }, [campaigns, statusFilter, search, sortKey, sortDir]);

  const statusFilters: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "Alle" },
    { value: "draft", label: "In Bearbeitung" },
    { value: "sent", label: "Gesendet" },
    { value: "scheduled", label: "Geplant" },
    { value: "failed", label: "Fehlgeschlagen" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kampagnen</h1>
        <Link href="/dashboard/campaigns/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Neue Kampagne
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name oder Betreff..."
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-1">
          {statusFilters.map(({ value, label }) => (
            <Button
              key={value}
              variant={statusFilter === value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(value)}
              className="h-8 text-xs"
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {campaigns.length === 0
                ? "Noch keine Kampagnen erstellt"
                : "Keine Kampagnen gefunden"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      onClick={() => toggleSort("name")}
                      className="flex items-center gap-1 font-medium"
                    >
                      Name
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    </button>
                  </TableHead>
                  <TableHead>Betreff</TableHead>
                  <TableHead>
                    <button
                      onClick={() => toggleSort("status")}
                      className="flex items-center gap-1 font-medium"
                    >
                      Status
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => toggleSort("recipients")}
                      className="flex items-center gap-1 font-medium"
                    >
                      Empfänger:innen
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => toggleSort("created")}
                      className="flex items-center gap-1 font-medium"
                    >
                      Erstellt
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => toggleSort("sent")}
                      className="flex items-center gap-1 font-medium"
                    >
                      Gesendet
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const isDraft = c.status === "draft";
                  return (
                    <TableRow
                      key={c.id}
                      className={isDraft ? "cursor-pointer hover:bg-muted/80" : ""}
                      onClick={
                        isDraft
                          ? () => router.push(`/dashboard/campaigns/${c.id}`)
                          : undefined
                      }
                    >
                      <TableCell className="font-medium">
                        {c.name || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {c.subject || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[c.status]}>
                          {statusLabels[c.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{c.recipient_count || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDateShort(c.created_at)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {c.sent_at
                          ? formatDateShort(c.sent_at)
                          : c.scheduled_at
                          ? `Geplant ${formatDateShort(c.scheduled_at)}`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
