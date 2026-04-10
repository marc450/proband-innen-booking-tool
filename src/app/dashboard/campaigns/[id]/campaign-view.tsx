import Link from "next/link";
import { ArrowLeft, Calendar, Clock, Users } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildEmailHtml, type ContentBlock } from "@/lib/email-template";
import type { CampaignStatus } from "@/lib/types";

const statusLabels: Record<CampaignStatus, string> = {
  draft: "In Bearbeitung",
  scheduled: "Geplant",
  sending: "Wird gesendet",
  sent: "Gesendet",
  failed: "Fehlgeschlagen",
};

const statusVariants: Record<
  CampaignStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "outline",
  scheduled: "secondary",
  sending: "secondary",
  sent: "default",
  failed: "destructive",
};

const audienceLabels: Record<string, string> = {
  probandinnen: "Proband:innen",
  aerztinnen: "Ärzt:innen",
  alle: "Alle Kontakte",
};

interface Props {
  campaign: {
    id: string;
    name: string | null;
    subject: string;
    body_text: string;
    content_blocks: ContentBlock[] | null;
    status: CampaignStatus;
    audience_type: string | null;
    recipient_count: number | null;
    created_at: string;
    sent_at: string | null;
    scheduled_at: string | null;
    error_message: string | null;
  };
}

function formatDate(dateStr: string) {
  return format(new Date(dateStr), "dd.MM.yyyy 'um' HH:mm", { locale: de });
}

export function CampaignView({ campaign }: Props) {
  const blocks: ContentBlock[] =
    campaign.content_blocks && campaign.content_blocks.length > 0
      ? campaign.content_blocks
      : campaign.body_text
        ? [{ type: "text", text: campaign.body_text }]
        : [];

  const previewHtml = buildEmailHtml({
    firstName: "{Vorname}",
    contentBlocks: blocks,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/campaigns"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zu Kampagnen
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold truncate">
            {campaign.name || "Unbenannte Kampagne"}
          </h1>
          <p className="text-muted-foreground mt-1">{campaign.subject}</p>
        </div>
        <Badge variant={statusVariants[campaign.status]} className="shrink-0">
          {statusLabels[campaign.status]}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Metadata */}
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {campaign.audience_type && (
                <div className="flex items-start gap-2">
                  <Users className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <div className="text-muted-foreground text-xs">
                      Zielgruppe
                    </div>
                    <div className="font-medium">
                      {audienceLabels[campaign.audience_type] ||
                        campaign.audience_type}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <div className="text-muted-foreground text-xs">
                    Empfänger:innen
                  </div>
                  <div className="font-medium">
                    {campaign.recipient_count ?? 0}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <div className="text-muted-foreground text-xs">Erstellt</div>
                  <div className="font-medium">
                    {formatDate(campaign.created_at)}
                  </div>
                </div>
              </div>

              {campaign.sent_at && (
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <div className="text-muted-foreground text-xs">
                      Gesendet
                    </div>
                    <div className="font-medium">
                      {formatDate(campaign.sent_at)}
                    </div>
                  </div>
                </div>
              )}

              {!campaign.sent_at && campaign.scheduled_at && (
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <div className="text-muted-foreground text-xs">Geplant</div>
                    <div className="font-medium">
                      {formatDate(campaign.scheduled_at)}
                    </div>
                  </div>
                </div>
              )}

              {campaign.error_message && (
                <div className="pt-2 border-t">
                  <div className="text-xs text-destructive font-medium mb-1">
                    Fehler
                  </div>
                  <div className="text-xs text-destructive/90 break-words">
                    {campaign.error_message}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Email preview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">E-Mail Vorschau</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div
              className="border-t p-4"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
