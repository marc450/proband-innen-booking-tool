"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertDialog, ConfirmDialog } from "@/components/confirm-dialog";
import { Check, Copy, Plus, Ban, Trash2 } from "lucide-react";
import type { CourseTemplate, CourseSession } from "@/lib/types";

type CourseType = "Onlinekurs" | "Praxiskurs" | "Kombikurs" | "Premium";

interface Invite {
  id: string;
  token: string;
  template_id: string;
  session_id: string | null;
  course_type: CourseType;
  stripe_promotion_code_id: string | null;
  recipient_email: string | null;
  recipient_name: string | null;
  admin_note: string | null;
  max_uses: number;
  used_count: number;
  used_by_booking_id: string | null;
  used_at: string | null;
  expires_at: string | null;
  revoked: boolean;
  created_at: string;
  // Expanded joins from the API
  course_templates?: { title: string } | null;
  course_sessions?: { label_de: string | null; date_iso: string | null } | null;
}

interface Props {
  templates: CourseTemplate[];
  sessions: CourseSession[];
}

const COURSE_TYPES: CourseType[] = ["Onlinekurs", "Praxiskurs", "Kombikurs", "Premium"];

export function BookingInvitesManager({ templates, sessions }: Props) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alertState, setAlertState] = useState<{ title: string; description: string } | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<Invite | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create form state
  const [templateId, setTemplateId] = useState("");
  const [courseType, setCourseType] = useState<CourseType>("Kombikurs");
  const [sessionId, setSessionId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [promoCodeId, setPromoCodeId] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/booking-invites");
    if (res.ok) {
      setInvites(await res.json());
    } else {
      const data = await res.json();
      setAlertState({ title: "Fehler", description: data.error || "Einladungen konnten nicht geladen werden." });
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setTemplateId("");
    setCourseType("Kombikurs");
    setSessionId("");
    setRecipientName("");
    setRecipientEmail("");
    setPromoCodeId("");
    setAdminNote("");
    setExpiresAt("");
    setCreateError(null);
  };

  // Sessions relevant for the picked template, sorted by date ascending
  const sessionsForTemplate = useMemo(
    () =>
      sessions
        .filter((s) => s.template_id === templateId)
        .sort((a, b) => (a.date_iso || "").localeCompare(b.date_iso || "")),
    [sessions, templateId],
  );

  // Onlinekurs invites don't need a session id; everything else does.
  const needsSession = courseType !== "Onlinekurs";

  const handleCreate = async () => {
    setCreateError(null);
    if (!templateId) {
      setCreateError("Bitte einen Kurs auswählen.");
      return;
    }
    if (needsSession && !sessionId) {
      setCreateError("Bitte einen Kurstermin auswählen.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/booking-invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId,
        sessionId: needsSession ? sessionId : null,
        courseType,
        stripePromotionCodeId: promoCodeId.trim() || null,
        recipientEmail: recipientEmail.trim() || null,
        recipientName: recipientName.trim() || null,
        adminNote: adminNote.trim() || null,
        // HTML <input type="datetime-local"> returns "YYYY-MM-DDTHH:mm"
        // without a timezone; the server treats it as an ISO string in
        // the admin's local timezone, which is fine for a soft expiry.
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setCreateError(data.error || "Fehler beim Erstellen.");
      return;
    }
    setShowCreate(false);
    resetForm();
    await load();
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    const target = revokeTarget;
    setRevokeTarget(null);
    const res = await fetch(`/api/admin/booking-invites/${target.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revoked: true }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setAlertState({ title: "Fehler", description: data.error || "Einladung konnte nicht widerrufen werden." });
      return;
    }
    setInvites((prev) => prev.map((i) => (i.id === target.id ? { ...i, revoked: true } : i)));
  };

  const handleDelete = async (invite: Invite) => {
    const res = await fetch(`/api/admin/booking-invites/${invite.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setAlertState({ title: "Fehler", description: data.error || "Einladung konnte nicht gelöscht werden." });
      return;
    }
    setInvites((prev) => prev.filter((i) => i.id !== invite.id));
  };

  const buildLink = (token: string): string => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://kurse.ephia.de";
    return `${origin}/einladung/${token}`;
  };

  const copyLink = async (invite: Invite) => {
    try {
      await navigator.clipboard.writeText(buildLink(invite.token));
      setCopiedId(invite.id);
      setTimeout(
        () => setCopiedId((cur) => (cur === invite.id ? null : cur)),
        1500,
      );
    } catch {
      // Best effort
    }
  };

  const statusBadge = (invite: Invite) => {
    if (invite.revoked) return <Badge variant="destructive">Widerrufen</Badge>;
    if (invite.used_count >= invite.max_uses) return <Badge>Eingelöst</Badge>;
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return <Badge variant="secondary">Abgelaufen</Badge>;
    }
    return <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">Aktiv</Badge>;
  };

  return (
    <div className="space-y-4">
      <AlertDialog
        open={!!alertState}
        title={alertState?.title ?? ""}
        description={alertState?.description ?? ""}
        onClose={() => setAlertState(null)}
      />

      <ConfirmDialog
        open={!!revokeTarget}
        title="Einladung widerrufen?"
        description={
          revokeTarget
            ? `Die Einladung für ${revokeTarget.recipient_name || revokeTarget.recipient_email || "den Empfänger"} wird widerrufen und kann nicht mehr eingelöst werden.`
            : ""
        }
        confirmLabel="Widerrufen"
        variant="destructive"
        onConfirm={handleRevoke}
        onCancel={() => setRevokeTarget(null)}
      />

      <Dialog
        open={showCreate}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreate(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Neue Einladung erstellen</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Kurs *</Label>
              <Select value={templateId} onValueChange={(v) => { setTemplateId(v ?? ""); setSessionId(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Kurs wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.course_label_de || t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Kursvariante *</Label>
              <Select value={courseType} onValueChange={(v) => setCourseType(v as CourseType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COURSE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t === "Premium" ? "Komplettpaket" : t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {needsSession && (
              <div className="space-y-1.5">
                <Label>Kurstermin *</Label>
                <Select value={sessionId} onValueChange={(v) => setSessionId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder={sessionsForTemplate.length === 0 ? "Kein Termin für diesen Kurs" : "Kurstermin wählen..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {sessionsForTemplate.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label_de || s.date_iso}
                        {s.booked_seats >= s.max_seats ? " (ausgebucht)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Empfänger:in Name</Label>
                <Input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="optional"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Empfänger:in E-Mail</Label>
                <Input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="optional"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Stripe Promotion Code (optional)</Label>
              <Input
                value={promoCodeId}
                onChange={(e) => setPromoCodeId(e.target.value)}
                placeholder="promo_... (z.B. für 100% Rabatt-Code)"
              />
              <p className="text-xs text-muted-foreground">
                Die ID (nicht der Code), z.B. <code className="font-mono">promo_1Abc...</code>. Wenn gesetzt, wird der Code beim Checkout automatisch angewendet.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Ablaufdatum (optional)</Label>
              <Input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notiz (intern)</Label>
              <Textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={2}
                placeholder="Wofür ist diese Einladung?"
              />
            </div>

            {createError && <p className="text-sm text-destructive">{createError}</p>}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowCreate(false); resetForm(); }}
              disabled={saving}
            >
              Abbrechen
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Wird erstellt..." : "Einladung erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between gap-4 mb-6">
        <span className="text-sm text-muted-foreground">
          {invites.length} {invites.length === 1 ? "Einladung" : "Einladungen"}
        </span>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Einladung erstellen
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground text-sm">Lade Einladungen...</div>
      ) : invites.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          Noch keine Einladungen erstellt.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empfänger:in</TableHead>
              <TableHead>Kurs</TableHead>
              <TableHead>Variante</TableHead>
              <TableHead>Termin</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Erstellt</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invites.map((invite) => {
              const used = invite.used_count >= invite.max_uses;
              const expired =
                !!invite.expires_at && new Date(invite.expires_at) < new Date();
              const canCopy = !invite.revoked && !used && !expired;
              return (
                <TableRow key={invite.id}>
                  <TableCell>
                    <div className="text-sm">
                      {invite.recipient_name || <span className="text-muted-foreground italic">ohne Name</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {invite.recipient_email || "–"}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {invite.course_templates?.title || invite.template_id}
                  </TableCell>
                  <TableCell className="text-sm">
                    {invite.course_type === "Premium" ? "Komplettpaket" : invite.course_type}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {invite.course_sessions?.label_de
                      ? invite.course_sessions.label_de
                      : invite.course_sessions?.date_iso
                        ? format(new Date(invite.course_sessions.date_iso), "dd.MM.yyyy", { locale: de })
                        : "–"}
                  </TableCell>
                  <TableCell>{statusBadge(invite)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(invite.created_at), "dd.MM.yyyy, HH:mm", { locale: de })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      {canCopy && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyLink(invite)}
                          title="Einladungslink kopieren"
                        >
                          {copiedId === invite.id ? (
                            <Check className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      {!invite.revoked && !used && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRevokeTarget(invite)}
                          title="Einladung widerrufen"
                          className="text-destructive hover:text-destructive"
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                      {invite.used_count === 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(invite)}
                          title="Einladung löschen"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
