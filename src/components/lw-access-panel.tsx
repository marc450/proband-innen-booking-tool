"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog, AlertDialog } from "@/components/confirm-dialog";

// Renders the per-Auszubildende LMS-Zugriff diagnostic + repair panel
// for the detail page. Calls
//   GET  /api/admin/auszubildende/[id]/lw-access  → list bookings × LW
//   POST /api/admin/auszubildende/[id]/lw-access  → grant LW access
// Each row shows the booking + the LW status; "missing" rows expose a
// "Freischalten"-Button that calls POST and reloads.
//
// "missing" is the actionable state: contact bought the course in our
// DB but their LW user_id has no enrollment for it. Most common cause
// is the duplicate-email scenario (bought under a different address,
// LW user_id points at the other one). After clicking Freischalten we
// call enrollInLearnWorlds(email, lwCourseId) which either enrolls the
// existing LW user with this email or creates one.

interface LwAccessItem {
  bookingId: string | null;
  templateId: string | null;
  templateTitle: string;
  lwCourseId: string | null;
  courseType: string | null;
  // See server-side comment for the full taxonomy. "lw_only" is
  // surfaced here as a quiet "Nur LW" pill so admins know the user
  // has access in LearnWorlds even though no course_bookings row
  // backs it (typical for legacy_bookings imports).
  status: "enrolled" | "missing" | "no_lw_template" | "lw_only";
  progressPct: number | null;
  boughtAt: string | null;
}

export function LwAccessPanel({ auszubildendeId }: { auszubildendeId: string }) {
  const [items, setItems] = useState<LwAccessItem[] | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [lwUserId, setLwUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [grantPending, setGrantPending] = useState<LwAccessItem | null>(null);
  const [granting, setGranting] = useState(false);
  const [alertState, setAlertState] = useState<{ title: string; description: string } | null>(null);

  const refresh = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/admin/auszubildende/${auszubildendeId}/lw-access`,
      );
      const data = await res.json();
      if (!res.ok) {
        setLoadError(data.error || "LMS-Zugriff konnte nicht geladen werden.");
      } else {
        setItems(data.items ?? []);
        setEmail(data.email ?? null);
        setLwUserId(data.lwUserId ?? null);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Netzwerkfehler.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auszubildendeId]);

  const handleConfirmGrant = async () => {
    if (!grantPending?.lwCourseId) return;
    setGranting(true);
    try {
      const res = await fetch(
        `/api/admin/auszubildende/${auszubildendeId}/lw-access`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lwCourseId: grantPending.lwCourseId }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setAlertState({
          title: "Freischaltung fehlgeschlagen",
          description: data.error || "LW-Enrollment konnte nicht ausgeführt werden.",
        });
      } else {
        await refresh();
      }
    } catch (err) {
      setAlertState({
        title: "Freischaltung fehlgeschlagen",
        description: err instanceof Error ? err.message : "Netzwerkfehler.",
      });
    } finally {
      setGranting(false);
      setGrantPending(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            LMS-Zugriff
          </CardTitle>
          {!loading && (
            <button
              type="button"
              onClick={refresh}
              className="text-[11px] text-[#0066FF] hover:underline"
            >
              Aktualisieren
            </button>
          )}
        </div>
        {!loading && email && (
          <p className="text-[11px] text-muted-foreground mt-1">
            <span className="font-mono">{email}</span>
            {lwUserId ? (
              <>
                {" · LW-User "}
                <span className="font-mono">{lwUserId}</span>
              </>
            ) : (
              " · Noch kein LW-Konto"
            )}
          </p>
        )}
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-[#0066FF]" />
          </div>
        ) : loadError ? (
          <p className="px-4 pb-4 text-sm text-red-600">{loadError}</p>
        ) : !items || items.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground italic">
            Keine Buchungen vorhanden.
          </p>
        ) : (
          <div className="divide-y">
            {items.map((item, idx) => (
              <div
                key={`${item.bookingId ?? item.templateId}-${idx}`}
                className="px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">
                    {item.templateTitle}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                    {item.courseType && <span>{item.courseType}</span>}
                    {item.progressPct !== null && (
                      <span>· {Math.round(item.progressPct)}% durchgearbeitet</span>
                    )}
                  </div>
                </div>
                {item.status === "enrolled" ? (
                  <Badge variant="secondary" className="shrink-0 text-[10px] gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    In LW
                  </Badge>
                ) : item.status === "missing" ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="destructive" className="text-[10px] gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Nicht in LW
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setGrantPending(item)}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      Freischalten
                    </Button>
                  </div>
                ) : item.status === "lw_only" ? (
                  <Badge
                    variant="outline"
                    className="shrink-0 text-[10px] gap-1 bg-blue-50 text-blue-700 border-blue-200"
                    title="LearnWorlds-Enrollment ohne Buchungsdatensatz (z.B. Legacy-Import oder direkter LW-Grant)"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Nur LW
                  </Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    Kein Online-Anteil
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={!!grantPending}
        title="LMS-Zugriff freischalten"
        description={
          grantPending
            ? `${grantPending.templateTitle}${email ? ` für ${email}` : ""} in LearnWorlds freischalten? Erstellt das LW-Konto, falls noch keins existiert, und enrollt es in den Onlinekurs.`
            : ""
        }
        confirmLabel={granting ? "Wird freigeschaltet..." : "Freischalten"}
        onConfirm={handleConfirmGrant}
        onCancel={() => !granting && setGrantPending(null)}
      />

      <AlertDialog
        open={!!alertState}
        title={alertState?.title ?? ""}
        description={alertState?.description ?? ""}
        onClose={() => setAlertState(null)}
      />
    </Card>
  );
}
