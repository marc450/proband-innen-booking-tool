"use client";

import Link from "next/link";
import { EmailCampaign, CampaignStatus, Course } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus } from "lucide-react";

const statusLabels: Record<CampaignStatus, string> = {
  draft: "Entwurf",
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

interface Props {
  campaigns: EmailCampaign[];
  courses: Pick<Course, "id" | "title">[];
}

export function CampaignsManager({ campaigns, courses }: Props) {
  const courseMap = new Map(courses.map((c) => [c.id, c.title]));

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

      <Card>
        <CardContent className="p-0">
          {campaigns.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Noch keine Kampagnen erstellt
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Betreff</TableHead>
                  <TableHead>Kurs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Empfänger:innen</TableHead>
                  <TableHead>Datum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.subject}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.course_id ? courseMap.get(c.course_id) || "—" : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[c.status]}>
                        {statusLabels[c.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{c.recipient_count || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.sent_at
                        ? `Gesendet ${format(new Date(c.sent_at), "dd.MM.yyyy HH:mm", { locale: de })}`
                        : c.scheduled_at
                        ? `Geplant ${format(new Date(c.scheduled_at), "dd.MM.yyyy HH:mm", { locale: de })}`
                        : format(new Date(c.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
