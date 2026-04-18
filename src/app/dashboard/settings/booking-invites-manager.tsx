"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { Check, Copy, Plus, Ban, Trash2, X } from "lucide-react";
import type { CourseTemplate, CourseSession, Auszubildende } from "@/lib/types";

type AuszubildendePick = Pick<Auszubildende, "id" | "first_name" | "last_name" | "email" | "phone" | "title">;

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
  auszubildende: AuszubildendePick[];
}

const COURSE_TYPES: CourseType[] = ["Onlinekurs", "Praxiskurs", "Kombikurs", "Premium"];

/** Customer-facing German label for each course variant. */
function variantLabel(t: CourseType): string {
  if (t === "Kombikurs") return "Online- & Praxiskurs";
  if (t === "Premium") return "Komplettpaket";
  return t;
}

type DiscountCode = {
  id: string;
  code: string;
  active: boolean;
  percent_off: number | null;
  amount_off: number | null;
  currency: string | null;
};

const NO_PROMO = "__none__";

function formatDiscountLabel(c: DiscountCode): string {
  if (c.percent_off != null) return `${c.code} (${c.percent_off}% Rabatt)`;
  if (c.amount_off != null) {
    const eur = (c.amount_off / 100).toLocaleString("de-DE", { style: "currency", currency: c.currency?.toUpperCase() || "EUR" });
    return `${c.code} (${eur} Rabatt)`;
  }
  return c.code;
}

export function BookingInvitesManager({ templates, sessions, auszubildende }: Props) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
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
  const [assignedDoctorId, setAssignedDoctorId] = useState("");
  const [promoCodeId, setPromoCodeId] = useState(NO_PROMO);
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
    // Preload discount codes so the promo dropdown is ready when the
    // admin opens the create dialog.
    fetch("/api/admin/discount-codes")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: DiscountCode[]) => {
        if (Array.isArray(data)) setDiscountCodes(data.filter((c) => c.active));
      })
      .catch(() => {});
  }, []);

  const resetForm = () => {
    setTemplateId("");
    setCourseType("Kombikurs");
    setSessionId("");
    setAssignedDoctorId("");
    setPromoCodeId(NO_PROMO);
    setAdminNote("");
    setExpiresAt("");
    setCreateError(null);
  };

  // Sort doctors alphabetically for the dropdown, pre-formatted label.
  const doctorOptions = useMemo(() => {
    return [...auszubildende]
      .sort((a, b) => {
        const la = (a.last_name || "").toLowerCase();
        const lb = (b.last_name || "").toLowerCase();
        if (la !== lb) return la.localeCompare(lb, "de");
        return (a.first_name || "").toLowerCase().localeCompare((b.first_name || "").toLowerCase(), "de");
      })
      .map((a) => {
        const nameParts = [a.title, a.first_name, a.last_name].filter(Boolean);
        const name = nameParts.join(" ").trim() || a.email;
        return { id: a.id, email: a.email, firstName: a.first_name || "", lastName: a.last_name || "", label: `${name}${a.email ? ` (${a.email})` : ""}` };
      });
  }, [auszubildende]);

  // Sessions relevant for the picked template: only future dates, sorted
  // ascending. Invites for past sessions make no sense.
  const sessionsForTemplate = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    return sessions
      .filter((s) => s.template_id === templateId)
      .filter((s) => !s.date_iso || s.date_iso >= todayIso)
      .sort((a, b) => (a.date_iso || "").localeCompare(b.date_iso || ""));
  }, [sessions, templateId]);

  // Which variants the currently selected template offers (non-null price =
  // available for purchase). Falls back to all four when no template is
  // selected yet so the dropdown still shows something.
  const availableVariants: CourseType[] = useMemo(() => {
    if (!templateId) return COURSE_TYPES;
    const t = templates.find((x) => x.id === templateId);
    if (!t) return COURSE_TYPES;
    const list: CourseType[] = [];
    if (t.price_gross_online != null) list.push("Onlinekurs");
    if (t.price_gross_praxis != null) list.push("Praxiskurs");
    if (t.price_gross_kombi != null) list.push("Kombikurs");
    // Komplettpaket (Premium) is a bundle built on top of Kombi, so
    // include it whenever the course has either an explicit premium price
    // or at least a Kombi variant.
    if (t.price_gross_premium != null || t.price_gross_kombi != null) list.push("Premium");
    return list.length > 0 ? list : COURSE_TYPES;
  }, [templateId, templates]);

  // Auto-switch the variant when the chosen template doesn't offer the
  // currently selected one (e.g. picked a Kombikurs, then switched to an
  // online-only course).
  useEffect(() => {
    if (!availableVariants.includes(courseType) && availableVariants.length > 0) {
      setCourseType(availableVariants[0]);
    }
  }, [availableVariants, courseType]);

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
    const doctor = doctorOptions.find((d) => d.id === assignedDoctorId);
    if (!doctor) {
      setCreateError("Bitte eine:n Ärzt:in auswählen, dem/der die Einladung zugeordnet werden soll.");
      return;
    }
    const recipientName = [doctor.firstName, doctor.lastName].filter(Boolean).join(" ").trim() || null;
    const recipientEmail = doctor.email || null;
    setSaving(true);
    const res = await fetch("/api/admin/booking-invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId,
        sessionId: needsSession ? sessionId : null,
        courseType,
        stripePromotionCodeId: promoCodeId && promoCodeId !== NO_PROMO ? promoCodeId : null,
        recipientEmail,
        recipientName,
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
    if (invite.used_count >= invite.max_uses) {
      return (
        <div className="flex flex-col items-start gap-0.5">
          <Badge
            variant="outline"
            className="text-emerald-800 border-emerald-400 bg-emerald-50 gap-1"
          >
            <Check className="h-3 w-3" strokeWidth={3} />
            Eingelöst
          </Badge>
          {invite.used_at && (
            <span className="text-[10px] text-muted-foreground">
              am {format(new Date(invite.used_at), "dd.MM.yyyy, HH:mm", { locale: de })}
            </span>
          )}
        </div>
      );
    }
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return <Badge variant="secondary">Abgelaufen</Badge>;
    }
    return <Badge variant="outline" className="text-sky-700 border-sky-300 bg-sky-50">Aktiv</Badge>;
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
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Neue Einladung erstellen</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label>Kurs *</Label>
              <Select value={templateId} onValueChange={(v) => { setTemplateId(v ?? ""); setSessionId(""); }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Kurs wählen...">
                    {templateId
                      ? (templates.find((t) => t.id === templateId)?.course_label_de
                          || templates.find((t) => t.id === templateId)?.title
                          || "Kurs wählen...")
                      : "Kurs wählen..."}
                  </SelectValue>
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

            <div className="space-y-2">
              <Label>Kursvariante *</Label>
              <Select value={courseType} onValueChange={(v) => setCourseType(v as CourseType)}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {variantLabel(courseType)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableVariants.map((t) => (
                    <SelectItem key={t} value={t}>
                      {variantLabel(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {needsSession && (
              <div className="space-y-2">
                <Label>Kurstermin *</Label>
                <Select value={sessionId} onValueChange={(v) => setSessionId(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={sessionsForTemplate.length === 0 ? "Kein Termin für diesen Kurs" : "Kurstermin wählen..."}>
                      {sessionId
                        ? (() => {
                            const s = sessionsForTemplate.find((x) => x.id === sessionId);
                            if (!s) return "Kurstermin wählen...";
                            const label = s.label_de || s.date_iso || "";
                            return s.booked_seats >= s.max_seats ? `${label} (ausgebucht)` : label;
                          })()
                        : (sessionsForTemplate.length === 0 ? "Kein Termin für diesen Kurs" : "Kurstermin wählen...")}
                    </SelectValue>
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

            <div className="space-y-2">
              <Label>Ärzt:in *</Label>
              <DoctorAutocomplete
                doctors={doctorOptions}
                selectedId={assignedDoctorId}
                onChange={setAssignedDoctorId}
              />
              <p className="text-xs text-muted-foreground">
                Die Einladung wird auf Namen und E-Mail-Adresse der gewählten Ärzt:in ausgestellt.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Rabattcode (optional)</Label>
              <Select value={promoCodeId} onValueChange={(v) => setPromoCodeId(v ?? NO_PROMO)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Kein Rabattcode">
                    {promoCodeId === NO_PROMO || !promoCodeId
                      ? "Kein Rabattcode"
                      : (() => {
                          const c = discountCodes.find((d) => d.id === promoCodeId);
                          return c ? formatDiscountLabel(c) : "Kein Rabattcode";
                        })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PROMO}>Kein Rabattcode</SelectItem>
                  {discountCodes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {formatDiscountLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Wird beim Checkout automatisch angewendet. Rabattcodes kannst Du unter &quot;Rabattcodes&quot; verwalten.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Ablaufdatum (optional)</Label>
              <Input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>

            <div className="space-y-2">
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
                    {variantLabel(invite.course_type)}
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

// ─────────────────────────────────────────────────────────────────────
// DoctorAutocomplete
// Small single-select combobox over the pre-fetched auszubildende list.
// Behaves like the inbox ContactAutocomplete (type-to-filter, arrow-key
// nav, Enter/click to pick) but only ever holds one selection and does
// not produce chips; picking replaces the value.
// ─────────────────────────────────────────────────────────────────────

type DoctorOption = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  label: string;
};

function DoctorAutocomplete({
  doctors,
  selectedId,
  onChange,
}: {
  doctors: DoctorOption[];
  selectedId: string;
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => doctors.find((d) => d.id === selectedId) || null,
    [doctors, selectedId],
  );

  // Filter matches client-side; the full list is already in memory.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return doctors.slice(0, 20);
    return doctors
      .filter(
        (d) =>
          d.label.toLowerCase().includes(q) ||
          d.email.toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [doctors, query]);

  // Close dropdown when clicking outside.
  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  const pick = (d: DoctorOption) => {
    onChange(d.id);
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
  };

  const clear = () => {
    onChange("");
    setQuery("");
    setActiveIndex(-1);
    inputRef.current?.focus();
    setOpen(true);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i < results.length - 1 ? i + 1 : 0));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i > 0 ? i - 1 : results.length - 1));
      return;
    }
    if (e.key === "Enter") {
      if (activeIndex >= 0 && results[activeIndex]) {
        e.preventDefault();
        pick(results[activeIndex]);
      }
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "Backspace" && query === "" && selected) {
      // Quick-clear: backspace on empty input removes the current selection.
      e.preventDefault();
      clear();
    }
  };

  const placeholder =
    doctors.length === 0 ? "Keine Ärzt:innen angelegt" : "Name oder E-Mail suchen...";

  return (
    <div ref={containerRef} className="relative">
      {/* Selected chip OR search input. Keeping it as one box so the
          position doesn't jump when a selection is made. */}
      {selected ? (
        <div className="flex items-center gap-2 h-10 rounded-[10px] border border-input bg-card px-3 text-sm">
          <span className="truncate flex-1">
            <span className="font-medium">
              {[selected.firstName, selected.lastName].filter(Boolean).join(" ") || selected.email}
            </span>
            {selected.email && (
              <span className="text-muted-foreground ml-2">{selected.email}</span>
            )}
          </span>
          <button
            type="button"
            onClick={clear}
            className="shrink-0 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Auswahl entfernen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          disabled={doctors.length === 0}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="flex h-10 w-full rounded-[10px] border border-input bg-card px-3 py-2 text-sm outline-none transition-all hover:border-foreground/30 focus:border-ring focus:ring-2 focus:ring-ring/30 placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        />
      )}

      {open && !selected && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-popover rounded-[10px] p-1 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.12),0_2px_6px_-2px_rgba(0,0,0,0.08)] ring-1 ring-black/5 dark:ring-white/10 max-h-[260px] overflow-y-auto">
          {results.map((d, i) => (
            <button
              key={d.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                pick(d);
              }}
              className={`w-full flex flex-col items-start gap-0.5 rounded-[8px] px-3 py-2 text-left text-sm transition-colors ${
                i === activeIndex ? "bg-slate-100 dark:bg-white/5" : "hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              <span className="font-medium text-foreground">
                {[d.firstName, d.lastName].filter(Boolean).join(" ") || d.email}
              </span>
              {d.email && (
                <span className="text-xs text-muted-foreground">{d.email}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {open && !selected && query.trim() && results.length === 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-popover rounded-[10px] p-3 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.12),0_2px_6px_-2px_rgba(0,0,0,0.08)] ring-1 ring-black/5 dark:ring-white/10 text-sm text-muted-foreground">
          Keine Ärzt:innen gefunden.
        </div>
      )}
    </div>
  );
}
