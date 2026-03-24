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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
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
import { ArrowLeft, Send, Clock, ChevronDown, ChevronRight, Search } from "lucide-react";
import Link from "next/link";

interface CourseOption {
  id: string;
  title: string;
  course_date: string | null;
  location: string | null;
}

interface PatientOption {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  patient_status: "active" | "warning" | "blacklist";
}

interface Props {
  courses: CourseOption[];
  patients: PatientOption[];
}

export function CampaignComposer({ courses, patients }: Props) {
  const router = useRouter();

  // Form state
  const [courseId, setCourseId] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [excludeBlacklisted, setExcludeBlacklisted] = useState(true);
  const [manuallyExcluded, setManuallyExcluded] = useState<Set<string>>(new Set());
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [recipientSearch, setRecipientSearch] = useState("");
  const [showRecipients, setShowRecipients] = useState(false);

  // UI state
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCourse = courses.find((c) => c.id === courseId);

  // Deduplicate patients by email, prefer non-blacklisted
  const uniquePatients = useMemo(() => {
    const byEmail = new Map<string, PatientOption>();
    for (const p of patients) {
      const existing = byEmail.get(p.email.toLowerCase());
      if (!existing || (existing.patient_status === "blacklist" && p.patient_status !== "blacklist")) {
        byEmail.set(p.email.toLowerCase(), p);
      }
    }
    return Array.from(byEmail.values());
  }, [patients]);

  const eligiblePatients = useMemo(() => {
    return uniquePatients.filter((p) => {
      if (excludeBlacklisted && p.patient_status === "blacklist") return false;
      if (manuallyExcluded.has(p.id)) return false;
      return true;
    });
  }, [uniquePatients, excludeBlacklisted, manuallyExcluded]);

  const filteredRecipients = useMemo(() => {
    if (!recipientSearch) return uniquePatients;
    const q = recipientSearch.toLowerCase();
    return uniquePatients.filter((p) =>
      [p.first_name, p.last_name, p.email].filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [uniquePatients, recipientSearch]);

  const toggleExclude = (id: string) => {
    setManuallyExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formattedDate = selectedCourse?.course_date
    ? format(new Date(selectedCourse.course_date + "T00:00:00"), "EEEE, dd. MMMM yyyy", { locale: de })
    : "";

  // Live preview HTML
  const previewHtml = useMemo(() => {
    return buildEmailHtml({
      firstName: "Max",
      intro: bodyText || "Dein E-Mail-Text erscheint hier...",
      infoRows: [
        { label: "Kurs", value: selectedCourse?.title || "Kursname" },
        { label: "Datum", value: formattedDate || "Kursdatum" },
        { label: "Ort", value: selectedCourse?.location || "" },
      ],
    });
  }, [bodyText, selectedCourse, formattedDate]);

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
    courseId &&
    subject.trim() &&
    bodyText.trim() &&
    eligiblePatients.length > 0 &&
    (scheduleMode === "now" || (scheduledAt && !scheduleError));

  const handleSend = async () => {
    setConfirmOpen(false);
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/send-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          subject,
          bodyText,
          excludedPatientIds: Array.from(manuallyExcluded),
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
          {/* Course selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Kurs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={courseId} onValueChange={(val) => {
                if (!val) return;
                setCourseId(val);
                const c = courses.find((c) => c.id === val);
                if (c && !subject) setSubject(`Einladung: ${c.title}`);
              }}>
                <SelectTrigger>
                  <span className="truncate">
                    {courseId
                      ? courses.find((c) => c.id === courseId)?.title ?? "Kurs wählen..."
                      : "Kurs wählen..."}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                      {c.course_date ? ` (${format(new Date(c.course_date + "T00:00:00"), "dd.MM.yyyy")})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCourse && (
                <div className="text-sm text-muted-foreground space-y-1">
                  {formattedDate && <div>{formattedDate}</div>}
                  {selectedCourse.location && <div>{selectedCourse.location}</div>}
                </div>
              )}
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
                  placeholder="Der Haupttext Deiner E-Mail. Kursdetails werden automatisch als Info-Box angehängt."
                  className="min-h-[180px] resize-y"
                />
              </div>
            </CardContent>
          </Card>

          {/* Recipients */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Empfänger:innen ({eligiblePatients.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="exclude-blacklist"
                  checked={excludeBlacklisted}
                  onCheckedChange={(checked: boolean) => setExcludeBlacklisted(checked)}
                />
                <label htmlFor="exclude-blacklist" className="text-sm">
                  Blacklisted Proband:innen ausschließen
                  {excludeBlacklisted && (() => {
                    const count = uniquePatients.filter((p) => p.patient_status === "blacklist").length;
                    return count > 0 ? ` (${count} ausgeschlossen)` : "";
                  })()}
                </label>
              </div>

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
                    {filteredRecipients.map((p) => {
                      const isBlacklisted = p.patient_status === "blacklist";
                      const isExcluded = manuallyExcluded.has(p.id) || (excludeBlacklisted && isBlacklisted);
                      const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email;

                      return (
                        <label
                          key={p.id}
                          className={`flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-muted/50 ${isExcluded ? "opacity-50" : ""}`}
                        >
                          <Checkbox
                            checked={!isExcluded}
                            disabled={excludeBlacklisted && isBlacklisted}
                            onCheckedChange={() => {
                              if (!(excludeBlacklisted && isBlacklisted)) toggleExclude(p.id);
                            }}
                          />
                          <span className="flex-1 min-w-0 truncate">{name}</span>
                          <span className="text-xs text-muted-foreground truncate">{p.email}</span>
                          {isBlacklisted && (
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
                  An {eligiblePatients.length} Empfänger:innen senden
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
                ? `Die E-Mail wird am ${scheduledAt ? format(new Date(scheduledAt), "dd.MM.yyyy 'um' HH:mm", { locale: de }) : ""} an ${eligiblePatients.length} Empfänger:innen gesendet.`
                : `Die E-Mail wird jetzt an ${eligiblePatients.length} Empfänger:innen gesendet. Dieser Vorgang kann nicht rückgängig gemacht werden.`}
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
