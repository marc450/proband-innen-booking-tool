"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { buildEmailHtml } from "@/lib/email-template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ArrowLeft, Send, Clock, ChevronDown, ChevronRight, Search, Plus, X, Link as LinkIcon } from "lucide-react";
import Link from "next/link";

interface PatientOption {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  patient_status: "active" | "warning" | "blacklist";
}

interface AuszubildendeOption {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

interface Props {
  patients: PatientOption[];
  auszubildende: AuszubildendeOption[];
}

type AudienceType = "probandinnen" | "aerztinnen" | "alle";

interface EmailButton {
  label: string;
  url: string;
}

export function CampaignComposer({ patients, auszubildende }: Props) {
  const router = useRouter();

  // Form state
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [audienceType, setAudienceType] = useState<AudienceType>("probandinnen");
  const [excludeBlacklisted, setExcludeBlacklisted] = useState(true);
  const [manuallyExcluded, setManuallyExcluded] = useState<Set<string>>(new Set());
  const [buttons, setButtons] = useState<EmailButton[]>([]);
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [recipientSearch, setRecipientSearch] = useState("");
  const [showRecipients, setShowRecipients] = useState(false);

  // UI state
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset exclusions when audience changes
  const handleAudienceChange = (newAudience: AudienceType) => {
    setAudienceType(newAudience);
    setManuallyExcluded(new Set());
    setRecipientSearch("");
  };

  // Merge contacts into a unified list depending on audience
  const allContacts = useMemo(() => {
    const patientContacts = patients.map((p) => ({
      id: `p-${p.id}`,
      rawId: p.id,
      email: p.email,
      first_name: p.first_name,
      last_name: p.last_name,
      isBlacklisted: p.patient_status === "blacklist",
      source: "proband" as const,
    }));
    const azubiContacts = auszubildende.map((a) => ({
      id: `a-${a.id}`,
      rawId: a.id,
      email: a.email,
      first_name: a.first_name,
      last_name: a.last_name,
      isBlacklisted: false,
      source: "azubi" as const,
    }));

    if (audienceType === "probandinnen") return patientContacts;
    if (audienceType === "aerztinnen") return azubiContacts;
    // "alle" — merge and dedupe by email
    type Contact = typeof patientContacts[0] | typeof azubiContacts[0];
    const byEmail = new Map<string, Contact>();
    for (const c of [...azubiContacts, ...patientContacts]) {
      const key = c.email.toLowerCase();
      if (!byEmail.has(key)) byEmail.set(key, c);
    }
    return Array.from(byEmail.values());
  }, [patients, auszubildende, audienceType]);

  const eligibleContacts = useMemo(() => {
    return allContacts.filter((c) => {
      if (excludeBlacklisted && c.isBlacklisted) return false;
      if (manuallyExcluded.has(c.id)) return false;
      return true;
    });
  }, [allContacts, excludeBlacklisted, manuallyExcluded]);

  const filteredRecipients = useMemo(() => {
    if (!recipientSearch) return allContacts;
    const q = recipientSearch.toLowerCase();
    return allContacts.filter((c) =>
      [c.first_name, c.last_name, c.email].filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [allContacts, recipientSearch]);

  const toggleExclude = (id: string) => {
    setManuallyExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Button management
  const addButton = () => {
    if (buttons.length < 3) {
      setButtons([...buttons, { label: "", url: "" }]);
    }
  };
  const updateButton = (index: number, field: "label" | "url", value: string) => {
    setButtons((prev) => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)));
  };
  const removeButton = (index: number) => {
    setButtons((prev) => prev.filter((_, i) => i !== index));
  };

  // Live preview HTML
  const previewHtml = useMemo(() => {
    const validButtons = buttons.filter((b) => b.label && b.url);
    return buildEmailHtml({
      firstName: "Max",
      intro: bodyText || "Dein E-Mail-Text erscheint hier...",
      buttons: validButtons,
    });
  }, [bodyText, buttons]);

  // Schedule validation
  const scheduleError = useMemo(() => {
    if (scheduleMode !== "later" || !scheduledAt) return null;
    const dt = new Date(scheduledAt);
    const now = new Date();
    if (dt <= now) return "Zeitpunkt muss in der Zukunft liegen.";
    const maxDate = new Date(now.getTime() + 72 * 60 * 60 * 1000);
    if (dt > maxDate) return "Maximal 72 Stunden im Voraus planbar.";
    return null;
  }, [scheduleMode, scheduledAt]);

  const canSend =
    name.trim() &&
    subject.trim() &&
    bodyText.trim() &&
    eligibleContacts.length > 0 &&
    (scheduleMode === "now" || (scheduledAt && !scheduleError));

  const handleSend = async () => {
    setConfirmOpen(false);
    setSending(true);
    setError(null);

    try {
      const validButtons = buttons.filter((b) => b.label && b.url);
      const res = await fetch("/api/send-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          subject,
          bodyText,
          audienceType,
          buttons: validButtons,
          excludedIds: Array.from(manuallyExcluded),
          excludeBlacklisted,
          scheduledAt: scheduleMode === "later" ? new Date(scheduledAt).toISOString() : null,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Fehler beim Senden.");
        return;
      }

      router.push("/dashboard/campaigns");
      router.refresh();
    } catch {
      setError("Netzwerkfehler beim Senden.");
    } finally {
      setSending(false);
    }
  };

  const hasBlacklisted = audienceType !== "aerztinnen" && allContacts.some((c) => c.isBlacklisted);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/campaigns">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Alle Kampagnen
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Neue Kampagne</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Form */}
        <div className="space-y-6">
          {/* Campaign name */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Kampagne</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z.B. Einladung Grundkurs Mai, Newsletter April..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Email content */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">E-Mail Inhalt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Betreff</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Betreff der E-Mail..."
                />
              </div>
              <div className="space-y-2">
                <Label>Text</Label>
                <Textarea
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  placeholder="Der Haupttext Deiner E-Mail."
                  className="min-h-[180px] resize-y"
                />
              </div>

              {/* Buttons */}
              <div className="space-y-2">
                <Label>Buttons</Label>
                {buttons.map((btn, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={btn.label}
                      onChange={(e) => updateButton(i, "label", e.target.value)}
                      placeholder="Button-Text"
                      className="flex-1"
                    />
                    <div className="relative flex-1">
                      <LinkIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        value={btn.url}
                        onChange={(e) => updateButton(i, "url", e.target.value)}
                        placeholder="https://..."
                        className="pl-7"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeButton(i)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {buttons.length < 3 && (
                  <Button variant="outline" size="sm" onClick={addButton}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Button hinzufügen
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recipients */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Empfänger:innen ({eligibleContacts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Audience toggle */}
              <div className="flex bg-muted rounded-lg p-1">
                {([
                  { value: "probandinnen", label: "Proband:innen" },
                  { value: "aerztinnen", label: "Ärzt:innen" },
                  { value: "alle", label: "Alle" },
                ] as const).map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => handleAudienceChange(value)}
                    className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                      audienceType === value
                        ? "bg-white text-foreground shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {hasBlacklisted && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="exclude-blacklist"
                    checked={excludeBlacklisted}
                    onCheckedChange={(checked: boolean) => setExcludeBlacklisted(checked)}
                  />
                  <label htmlFor="exclude-blacklist" className="text-sm">
                    Blacklisted Proband:innen ausschließen
                    {excludeBlacklisted && (() => {
                      const count = allContacts.filter((c) => c.isBlacklisted).length;
                      return count > 0 ? ` (${count} ausgeschlossen)` : "";
                    })()}
                  </label>
                </div>
              )}

              <button
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setShowRecipients(!showRecipients)}
              >
                {showRecipients ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                Einzelne Empfänger:innen bearbeiten
              </button>

              {showRecipients && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <Search className="h-3 w-3 text-muted-foreground" />
                    <Input
                      value={recipientSearch}
                      onChange={(e) => setRecipientSearch(e.target.value)}
                      placeholder="Suchen..."
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="max-h-[240px] overflow-y-auto border rounded-md divide-y">
                    {filteredRecipients.map((c) => {
                      const isExcluded = manuallyExcluded.has(c.id) || (excludeBlacklisted && c.isBlacklisted);
                      const displayName = [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email;

                      return (
                        <label
                          key={c.id}
                          className={`flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-muted/50 ${isExcluded ? "opacity-50" : ""}`}
                        >
                          <Checkbox
                            checked={!isExcluded}
                            disabled={excludeBlacklisted && c.isBlacklisted}
                            onCheckedChange={() => {
                              if (!(excludeBlacklisted && c.isBlacklisted)) toggleExclude(c.id);
                            }}
                          />
                          <span className="flex-1 min-w-0 truncate">{displayName}</span>
                          <span className="text-xs text-muted-foreground truncate">{c.email}</span>
                          {c.isBlacklisted && (
                            <span className="text-xs text-red-500 shrink-0">Blacklist</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Zeitpunkt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="schedule"
                    checked={scheduleMode === "now"}
                    onChange={() => setScheduleMode("now")}
                  />
                  Jetzt senden
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="schedule"
                    checked={scheduleMode === "later"}
                    onChange={() => setScheduleMode("later")}
                  />
                  Zeitpunkt planen
                </label>
              </div>
              {scheduleMode === "later" && (
                <div className="space-y-1">
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                  {scheduleError && (
                    <p className="text-xs text-destructive">{scheduleError}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action */}
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3">
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!canSend || sending}
              className="flex-1"
            >
              {sending ? (
                "Wird gesendet..."
              ) : scheduleMode === "later" ? (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Kampagne planen
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  An {eligibleContacts.length} Empfänger:innen senden
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="space-y-3">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Vorschau</CardTitle>
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

      {/* Confirmation dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {scheduleMode === "later" ? "Kampagne planen?" : "Kampagne senden?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {scheduleMode === "later"
                ? `Die E-Mail wird am ${scheduledAt ? format(new Date(scheduledAt), "dd.MM.yyyy 'um' HH:mm", { locale: de }) : ""} an ${eligibleContacts.length} Empfänger:innen gesendet.`
                : `Die E-Mail wird jetzt an ${eligibleContacts.length} Empfänger:innen gesendet. Dieser Vorgang kann nicht rückgängig gemacht werden.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend}>
              {scheduleMode === "later" ? "Planen" : "Jetzt senden"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
