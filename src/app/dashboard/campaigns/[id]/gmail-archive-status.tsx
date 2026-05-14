"use client";

import { useEffect, useState } from "react";
import { Archive, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { GmailArchiveStatus } from "@/lib/types";

interface Props {
  campaignId: string;
  initial: {
    status: GmailArchiveStatus | null;
    progress: number;
    total: number;
    failed: number;
    error: string | null;
    finishedAt: string | null;
  };
}

const POLL_INTERVAL_MS = 3000;

export function GmailArchiveStatusCard({ campaignId, initial }: Props) {
  const [state, setState] = useState(initial);

  useEffect(() => {
    // Nothing to poll for: legacy row (null) or already in a terminal
    // state when the page loaded.
    if (
      state.status === null ||
      state.status === "done" ||
      state.status === "failed" ||
      state.status === "skipped"
    ) {
      return;
    }

    const supabase = createClient();
    let cancelled = false;

    const tick = async () => {
      const { data } = await supabase
        .from("email_campaigns")
        .select(
          "gmail_archive_status, gmail_archive_progress, gmail_archive_total, gmail_archive_failed, gmail_archive_error, gmail_archive_finished_at",
        )
        .eq("id", campaignId)
        .maybeSingle();
      if (cancelled || !data) return;
      setState({
        status: data.gmail_archive_status as GmailArchiveStatus | null,
        progress: data.gmail_archive_progress ?? 0,
        total: data.gmail_archive_total ?? 0,
        failed: data.gmail_archive_failed ?? 0,
        error: data.gmail_archive_error,
        finishedAt: data.gmail_archive_finished_at,
      });
    };

    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [campaignId, state.status]);

  // Hide the row entirely for legacy campaigns sent before the
  // gmail_archive_* columns existed, or if the column hasn't been
  // populated yet for any reason (defensive against undefined too).
  if (state.status == null) return null;

  const { status, progress, total, failed, error } = state;

  if (status === "skipped") {
    return (
      <Row
        icon={<Archive className="h-4 w-4" />}
        label="Gmail-Archiv"
        value="Wird per Resend-Webhook bei Versand archiviert"
        tone="muted"
      />
    );
  }

  if (status === "pending") {
    return (
      <Row
        icon={<Loader2 className="h-4 w-4 animate-spin" />}
        label="Gmail-Archiv"
        value={`Archiviere im Hintergrund, ${progress} / ${total}${failed > 0 ? `, ${failed} fehlgeschlagen` : ""}`}
        tone="info"
      />
    );
  }

  if (status === "done") {
    return (
      <Row
        icon={<CheckCircle2 className="h-4 w-4" />}
        label="Gmail-Archiv"
        value={`Erledigt, ${progress} archiviert`}
        tone="success"
      />
    );
  }

  if (status === "partial") {
    return (
      <Row
        icon={<AlertTriangle className="h-4 w-4" />}
        label="Gmail-Archiv"
        value={`Teilweise erfolgreich, ${progress} archiviert, ${failed} fehlgeschlagen`}
        tone="warning"
        detail={error}
      />
    );
  }

  // failed
  return (
    <Row
      icon={<AlertTriangle className="h-4 w-4" />}
      label="Gmail-Archiv"
      value="Fehlgeschlagen"
      tone="danger"
      detail={error}
    />
  );
}

type Tone = "info" | "success" | "warning" | "danger" | "muted";

function Row({
  icon,
  label,
  value,
  tone,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: Tone;
  detail?: string | null;
}) {
  const toneClasses: Record<Tone, string> = {
    info: "text-[#0066FF]",
    success: "text-emerald-700",
    warning: "text-amber-700",
    danger: "text-destructive",
    muted: "text-muted-foreground",
  };
  return (
    <div className="flex items-start gap-2">
      <span className={`${toneClasses[tone]} shrink-0 mt-0.5`}>{icon}</span>
      <div className="min-w-0">
        <div className="text-muted-foreground text-xs">{label}</div>
        <div className={`font-medium ${toneClasses[tone]}`}>{value}</div>
        {detail && (
          <div className="text-xs text-muted-foreground break-words mt-1">
            {detail.length > 200 ? `${detail.slice(0, 200)}...` : detail}
          </div>
        )}
      </div>
    </div>
  );
}
