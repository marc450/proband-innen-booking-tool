"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EmailCampaign, CampaignStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableHeaderBar } from "@/components/table/table-header-bar";
import { SortableHead } from "@/components/table/sortable-head";
import { useTableSort } from "@/hooks/use-table-sort";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Plus, Pencil, Copy, Trash2, Eye } from "lucide-react";

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
type StatusFilter = "all" | CampaignStatus;

interface Props {
  campaigns: EmailCampaign[];
}

function formatDateShort(dateStr: string) {
  return format(new Date(dateStr), "dd.MM.yyyy HH:mm", { locale: de });
}

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "draft", label: "In Bearbeitung" },
  { value: "sent", label: "Gesendet" },
  { value: "scheduled", label: "Geplant" },
  { value: "failed", label: "Fehlgeschlagen" },
];

export function CampaignsManager({ campaigns: initialCampaigns }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const { sortKey, sortDir, handleSort } = useTableSort<SortKey>("created", "desc");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = campaigns;

    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.subject.toLowerCase().includes(q)
      );
    }

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

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from("email_campaigns").delete().eq("id", deleteId);
    setCampaigns((prev) => prev.filter((c) => c.id !== deleteId));
    setDeleteId(null);
  };

  const handleDuplicate = async (campaign: EmailCampaign) => {
    setDuplicating(campaign.id);
    try {
      const { data, error } = await supabase
        .from("email_campaigns")
        .insert({
          name: campaign.name ? `${campaign.name} (Kopie)` : "Kopie",
          subject: campaign.subject,
          body_text: campaign.body_text,
          status: "draft",
          recipient_count: 0,
          excluded_patient_ids: [],
        })
        .select("*")
        .single();

      if (!error && data) {
        setCampaigns((prev) => [data, ...prev]);
        router.push(`/dashboard/campaigns/${data.id}`);
      }
    } finally {
      setDuplicating(null);
    }
  };

  return (
    <div className="space-y-6">
      <TableHeaderBar
        title="Kampagnen"
        count={filtered.length}
        countLabel="Kampagnen"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Name oder Betreff..."
        filters={
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
        }
        actions={
          <Link href="/dashboard/campaigns/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Neue Kampagne
            </Button>
          </Link>
        }
      />

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
              <SortableHead label="Name" sortKey="name" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
              <TableHead>Betreff</TableHead>
              <SortableHead label="Status" sortKey="status" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
              <SortableHead label="Empfänger:innen" sortKey="recipients" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
              <SortableHead label="Erstellt" sortKey="created" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
              <SortableHead label="Gesendet" sortKey="sent" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => {
              const isDraft = c.status === "draft";
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/dashboard/campaigns/${c.id}`}
                      className="text-primary hover:underline"
                    >
                      {c.name || "—"}
                    </Link>
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
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => router.push(`/dashboard/campaigns/${c.id}`)}
                        className="p-1.5 rounded hover:bg-gray-100 text-muted-foreground hover:text-foreground transition-colors"
                        title={isDraft ? "Bearbeiten" : "Ansehen"}
                      >
                        {isDraft ? (
                          <Pencil className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicate(c);
                        }}
                        disabled={duplicating === c.id}
                        className="p-1.5 rounded hover:bg-gray-100 text-muted-foreground hover:text-foreground transition-colors"
                        title="Duplizieren"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(c.id);
                        }}
                        className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                        title="Löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onCancel={() => setDeleteId(null)}
        title="Kampagne löschen"
        description="Diese Kampagne wird unwiderruflich gelöscht."
        confirmLabel="Löschen"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
