"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { useRouter } from "next/navigation";
import { buildEmailHtml, type ContentBlock } from "@/lib/email-template";
import { normalizeEmail } from "@/lib/email-normalize";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/app/dashboard/inbox/rich-text-editor";
import { EmailPreview } from "../email-preview";
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
import { ArrowLeft, Send, Clock, ChevronDown, ChevronRight, Search, Plus, X, Link as LinkIcon, Type, Save, ImageIcon, Paperclip } from "lucide-react";
import Link from "next/link";

interface PatientOption {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  patient_status: "active" | "warning" | "blacklist" | "inactive";
}

interface AuszubildendeOption {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

interface ExistingCampaign {
  id: string;
  name: string | null;
  subject: string;
  body_text: string;
  content_blocks?: ContentBlock[] | null;
  audience_type?: AudienceType | null;
  excluded_patient_ids?: string[] | null;
}

interface Props {
  patients: PatientOption[];
  auszubildende: AuszubildendeOption[];
  existingCampaign?: ExistingCampaign;
}

type AudienceType = "probandinnen" | "aerztinnen" | "alle";

interface ContactItem {
  id: string;
  rawId: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  isBlacklisted: boolean;
  source: "proband" | "azubi";
}

function RecipientSearch({
  recipientSearch,
  setRecipientSearch,
  filteredRecipients,
  manuallyExcluded,
  excludeBlacklisted,
  toggleExclude,
}: {
  recipientSearch: string;
  setRecipientSearch: (v: string) => void;
  filteredRecipients: ContactItem[];
  manuallyExcluded: Set<string>;
  excludeBlacklisted: boolean;
  toggleExclude: (id: string) => void;
}) {
  const searchRef = useRef<HTMLDivElement>(null);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const showDropdown = recipientSearch.length >= 2 && filteredRecipients.length > 0;

  // Recalculate position when dropdown should show
  useEffect(() => {
    if (!showDropdown || !searchRef.current) {
      setDropdownRect(null);
      return;
    }
    const rect = searchRef.current.getBoundingClientRect();
    setDropdownRect({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, [showDropdown, recipientSearch]);

  // Close on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        // Check if click is inside the portal dropdown
        const dropdown = document.getElementById("recipient-search-dropdown");
        if (dropdown && dropdown.contains(e.target as Node)) return;
        setRecipientSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDropdown, setRecipientSearch]);

  return (
    <div ref={searchRef}>
      <div className="flex items-center gap-2">
        <Search className="h-3 w-3 text-muted-foreground" />
        <Input
          value={recipientSearch}
          onChange={(e) => setRecipientSearch(e.target.value)}
          placeholder="Empfänger:in suchen..."
          className="h-8 text-sm"
        />
      </div>
      {showDropdown && dropdownRect && ReactDOM.createPortal(
        <div
          id="recipient-search-dropdown"
          className="bg-white border rounded-md shadow-lg max-h-[240px] overflow-y-auto"
          style={{
            position: "fixed",
            top: dropdownRect.top,
            left: dropdownRect.left,
            width: dropdownRect.width,
            zIndex: 9999,
          }}
        >
          {filteredRecipients.slice(0, 20).map((c) => {
            const isExcluded = manuallyExcluded.has(c.id) || (excludeBlacklisted && c.isBlacklisted);
            const displayName = [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email;
            const isBlacklistLocked = excludeBlacklisted && c.isBlacklisted;

            return (
              <button
                key={c.id}
                type="button"
                disabled={isBlacklistLocked}
                onClick={() => {
                  if (!isBlacklistLocked) toggleExclude(c.id);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors ${isBlacklistLocked ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <Checkbox
                  checked={!isExcluded}
                  disabled={isBlacklistLocked}
                  className="pointer-events-none"
                />
                <span className="flex-1 min-w-0 truncate font-medium">{displayName}</span>
                <span className="text-xs text-gray-500 truncate max-w-[180px]">{c.email}</span>
                {c.isBlacklisted && (
                  <span className="text-xs text-red-500 shrink-0">Blacklist</span>
                )}
              </button>
            );
          })}
          {filteredRecipients.length > 20 && (
            <div className="px-3 py-1.5 text-xs text-gray-500 text-center">
              +{filteredRecipients.length - 20} weitere Ergebnisse...
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

export function CampaignComposer({ patients, auszubildende, existingCampaign }: Props) {
  const router = useRouter();

  // Form state — pre-fill from existing draft if editing
  const [campaignId, setCampaignId] = useState(existingCampaign?.id || "");
  const [name, setName] = useState(existingCampaign?.name || "");
  const [subject, setSubject] = useState(existingCampaign?.subject || "");
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>(() => {
    // Prefer structured content_blocks (preserves images/buttons)
    if (existingCampaign?.content_blocks?.length) {
      return existingCampaign.content_blocks;
    }
    // Fallback to body_text for older drafts
    if (existingCampaign?.body_text) {
      return [{ type: "text", text: existingCampaign.body_text }];
    }
    return [{ type: "text", text: "" }];
  });
  const [audienceType, setAudienceType] = useState<AudienceType>(
    existingCampaign?.audience_type || "probandinnen",
  );
  const [excludeBlacklisted, setExcludeBlacklisted] = useState(true);
  const [manuallyExcluded, setManuallyExcluded] = useState<Set<string>>(
    () => new Set(existingCampaign?.excluded_patient_ids || []),
  );
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [recipientSearch, setRecipientSearch] = useState("");
  const [showRecipients, setShowRecipients] = useState(false);
  // Bulk-exclude by pasted email list (e.g. recovering from a partial send).
  const [bulkExcludeText, setBulkExcludeText] = useState("");
  const [bulkExcludeResult, setBulkExcludeResult] = useState<
    { added: number; alreadyExcluded: number; notFound: string[] } | null
  >(null);

  const [attachments, setAttachments] = useState<File[]>([]);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // UI state
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
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

  // Parse the pasted "exclude these addresses" textarea and move every
  // matching contact into `manuallyExcluded`. Accepts any common separator
  // (newline, comma, semicolon, tab, whitespace). Matching is gmail-alias
  // aware via normalizeEmail, so googlemail.com ↔ gmail.com addresses line
  // up with our stored rows.
  const applyBulkExclude = () => {
    const tokens = bulkExcludeText
      .split(/[\s,;]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (tokens.length === 0) {
      setBulkExcludeResult(null);
      return;
    }

    const byNormalized = new Map<string, string>(); // normalized email -> contact id
    for (const c of allContacts) {
      const key = normalizeEmail(c.email);
      if (key && !byNormalized.has(key)) byNormalized.set(key, c.id);
    }

    const notFound: string[] = [];
    let added = 0;
    let alreadyExcluded = 0;
    const next = new Set(manuallyExcluded);
    for (const raw of tokens) {
      const key = normalizeEmail(raw);
      if (!key || !key.includes("@")) {
        notFound.push(raw);
        continue;
      }
      const id = byNormalized.get(key);
      if (!id) {
        notFound.push(raw);
        continue;
      }
      if (next.has(id)) {
        alreadyExcluded += 1;
      } else {
        next.add(id);
        added += 1;
      }
    }
    setManuallyExcluded(next);
    setBulkExcludeResult({ added, alreadyExcluded, notFound });
    if (added > 0 || alreadyExcluded > 0) setBulkExcludeText("");
  };

  // Content block management
  const updateBlock = (index: number, updates: Record<string, string>) => {
    setContentBlocks((prev) =>
      prev.map((b, i) => (i === index ? { ...b, ...updates } as ContentBlock : b))
    );
  };
  const removeBlock = (index: number) => {
    setContentBlocks((prev) => prev.filter((_, i) => i !== index));
  };
  const insertBlock = (afterIndex: number, block: ContentBlock) => {
    setContentBlocks((prev) => [
      ...prev.slice(0, afterIndex + 1),
      block,
      ...prev.slice(afterIndex + 1),
    ]);
  };

  // Track which block index the image should be inserted after
  const [imageInsertAfter, setImageInsertAfter] = useState(0);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  // Upload the image to Supabase Storage and insert the public URL into the
  // content block. Inline base64 (data:) URLs used to work in Gmail web but
  // were stripped by Outlook, Gmail mobile and some iOS Mail configurations,
  // which caused the "screenshot shows up for some recipients, not for others"
  // bug. Hosting on a public URL renders everywhere.
  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setImageUploadError(null);
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/campaign-images", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setImageUploadError(data.error || "Upload fehlgeschlagen.");
        return;
      }
      insertBlock(imageInsertAfter, { type: "image", src: data.url, alt: file.name });
    } catch {
      setImageUploadError("Upload fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setImageUploading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const hasContent = contentBlocks.some(
    (b) => (b.type === "text" && b.text.trim()) || (b.type === "button" && b.label && b.url)
  );

  // Live preview HTML
  const previewHtml = useMemo(() => {
    const previewBlocks = contentBlocks.map((b) => {
      if (b.type === "text") return { ...b, text: b.text || "Dein Text erscheint hier..." };
      return b;
    });
    return buildEmailHtml({
      firstName: "{Vorname}",
      contentBlocks: previewBlocks,
    });
  }, [contentBlocks]);

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
    hasContent &&
    eligibleContacts.length > 0 &&
    (scheduleMode === "now" || (scheduledAt && !scheduleError));

  const handleSend = async () => {
    setConfirmOpen(false);
    setSending(true);
    setError(null);

    try {
      // Convert attachments to base64
      const attachmentPayloads = await Promise.all(
        attachments.map(async (file) => ({
          filename: file.name,
          content: await fileToBase64(file),
        }))
      );

      const res = await fetch("/api/send-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: campaignId || undefined,
          name,
          subject,
          contentBlocks,
          audienceType,
          excludedIds: Array.from(manuallyExcluded),
          excludeBlacklisted,
          scheduledAt: scheduleMode === "later" ? new Date(scheduledAt).toISOString() : null,
          attachments: attachmentPayloads.length > 0 ? attachmentPayloads : undefined,
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

  const handleSaveDraft = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/save-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: campaignId || undefined,
          name,
          subject,
          contentBlocks,
          audienceType,
          excludedIds: Array.from(manuallyExcluded),
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Fehler beim Speichern.");
        return;
      }
      if (result.campaignId && !campaignId) {
        setCampaignId(result.campaignId);
      }
      router.push("/dashboard/campaigns");
      router.refresh();
    } catch {
      setError("Netzwerkfehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  };

  const canSaveDraft = !!(name.trim() || subject.trim());

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
        <h1 className="text-2xl font-bold">
          {existingCampaign ? "Kampagne bearbeiten" : "Neue Kampagne"}
        </h1>
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

              {/* Content blocks */}
              <div className="space-y-3">
                <Label>Inhalt</Label>
                {contentBlocks.map((block, i) => (
                  <div key={i} className="space-y-1">
                    {block.type === "text" ? (
                      <div className="relative">
                        <RichTextEditor
                          value={block.text}
                          onChange={(html) => updateBlock(i, { text: html })}
                          placeholder="Text eingeben..."
                          className="min-h-[120px]"
                        />
                        {contentBlocks.length > 1 && (
                          <button
                            onClick={() => removeBlock(i)}
                            className="absolute top-1 right-1 z-10 bg-white/80 hover:bg-white p-1 rounded-full text-gray-300 hover:text-gray-500 shadow-sm"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ) : block.type === "button" ? (
                      <div className="flex items-center gap-2 bg-blue-50 rounded-lg p-2">
                        <LinkIcon className="h-4 w-4 text-[#0066FF] flex-shrink-0" />
                        <Input
                          value={block.label}
                          onChange={(e) => updateBlock(i, { label: e.target.value })}
                          placeholder="Button-Text"
                          className="flex-1 h-8 text-sm"
                        />
                        <Input
                          value={block.url}
                          onChange={(e) => updateBlock(i, { url: e.target.value })}
                          placeholder="https://..."
                          className="flex-1 h-8 text-sm"
                        />
                        <button
                          onClick={() => removeBlock(i)}
                          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : block.type === "image" ? (
                      <div className="relative bg-gray-50 rounded-lg p-2">
                        <img
                          src={block.src}
                          alt={block.alt || ""}
                          className="max-w-full max-h-[200px] rounded-lg object-contain"
                        />
                        <button
                          onClick={() => removeBlock(i)}
                          className="absolute top-3 right-3 bg-white/80 hover:bg-white p-1 rounded-full text-gray-500 hover:text-gray-700 shadow-sm"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : null}

                    {/* Insert controls between blocks */}
                    <div className="flex items-center justify-center gap-2 py-1">
                      <button
                        onClick={() => insertBlock(i, { type: "text", text: "" })}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
                      >
                        <Type className="h-3 w-3" />
                        Text
                      </button>
                      <button
                        onClick={() => insertBlock(i, { type: "button", label: "", url: "" })}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                        Button
                      </button>
                      <button
                        onClick={() => {
                          setImageInsertAfter(i);
                          imageInputRef.current?.click();
                        }}
                        disabled={imageUploading}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors disabled:opacity-60 disabled:cursor-wait"
                      >
                        <ImageIcon className="h-3 w-3" />
                        {imageUploading && imageInsertAfter === i ? "Lädt..." : "Bild"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Hidden file inputs */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              handleImageUpload(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={attachmentInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              setAttachments((prev) => [...prev, ...files]);
              e.target.value = "";
            }}
          />

          {/* Attachments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Anhänge</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachments.map((file, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700"
                    >
                      <Paperclip className="h-3 w-3 text-gray-400" />
                      <span className="truncate max-w-[150px]">{file.name}</span>
                      <span className="text-gray-400">{Math.round(file.size / 1024)} KB</span>
                      <button
                        onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <Button variant="outline" size="sm" onClick={() => attachmentInputRef.current?.click()}>
                <Paperclip className="h-3.5 w-3.5 mr-1" />
                Anhang hinzufügen
              </Button>
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

              {/* Select all / Deselect all */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setManuallyExcluded(new Set())}
                  className="text-xs font-medium text-[#0066FF] hover:underline"
                >
                  Alle auswählen
                </button>
                <span className="text-xs text-muted-foreground">·</span>
                <button
                  type="button"
                  onClick={() => {
                    const allIds = new Set(allContacts.map((c) => c.id));
                    setManuallyExcluded(allIds);
                  }}
                  className="text-xs font-medium text-[#0066FF] hover:underline"
                >
                  Alle abwählen
                </button>
              </div>

              {/* Autocomplete search to add specific recipients */}
              <RecipientSearch
                recipientSearch={recipientSearch}
                setRecipientSearch={setRecipientSearch}
                filteredRecipients={filteredRecipients}
                manuallyExcluded={manuallyExcluded}
                excludeBlacklisted={excludeBlacklisted}
                toggleExclude={toggleExclude}
              />

              {/* Selected recipients list */}
              {eligibleContacts.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    {eligibleContacts.length} Empfänger:innen ausgewählt
                  </div>
                  <div className="max-h-[180px] overflow-y-auto border rounded-md p-2 flex flex-wrap gap-1.5">
                    {eligibleContacts.map((c) => {
                      const displayName = [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email;
                      return (
                        <span
                          key={c.id}
                          className="inline-flex items-center gap-1 bg-blue-50 text-[#0066FF] rounded-full pl-2.5 pr-1 py-0.5 text-xs font-medium"
                        >
                          {displayName}
                          <button
                            type="button"
                            onClick={() => toggleExclude(c.id)}
                            className="hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                            aria-label={`${displayName} entfernen`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bulk exclude by pasted email list. Useful when recovering
                  from a partially-sent campaign: paste the addresses that
                  already received the mail and we remove them from the
                  selection before sending. */}
              <details className="rounded-md border border-dashed border-muted-foreground/30">
                <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
                  Adressen per Liste ausschließen
                </summary>
                <div className="px-3 pb-3 pt-1 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Füge die E-Mail-Adressen ein, die nicht erneut angeschrieben werden sollen. Zeilenumbruch, Komma oder Leerzeichen sind alle erlaubt.
                  </p>
                  <textarea
                    value={bulkExcludeText}
                    onChange={(e) => {
                      setBulkExcludeText(e.target.value);
                      setBulkExcludeResult(null);
                    }}
                    placeholder="anna@example.com&#10;tobias@example.com, lisa@gmail.com"
                    className="w-full min-h-[96px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={applyBulkExclude}
                      disabled={!bulkExcludeText.trim()}
                    >
                      Ausschließen
                    </Button>
                    {bulkExcludeResult && (
                      <span className="text-xs text-muted-foreground">
                        {bulkExcludeResult.added} ausgeschlossen
                        {bulkExcludeResult.alreadyExcluded > 0 && `, ${bulkExcludeResult.alreadyExcluded} bereits`}
                        {bulkExcludeResult.notFound.length > 0 && `, ${bulkExcludeResult.notFound.length} nicht gefunden`}
                      </span>
                    )}
                  </div>
                  {bulkExcludeResult && bulkExcludeResult.notFound.length > 0 && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Nicht gefundene Adressen anzeigen
                      </summary>
                      <pre className="mt-1 max-h-32 overflow-y-auto rounded bg-muted/40 p-2 text-[11px] text-muted-foreground whitespace-pre-wrap break-all">
                        {bulkExcludeResult.notFound.join("\n")}
                      </pre>
                    </details>
                  )}
                </div>
              </details>

              {/* Expandable full recipient list */}
              <button
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setShowRecipients(!showRecipients)}
              >
                {showRecipients ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                Alle Empfänger:innen anzeigen
              </button>

              {showRecipients && (
                <div className="max-h-[300px] overflow-y-auto border rounded-md divide-y">
                  {allContacts.map((c) => {
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
          {imageUploadError && <p className="text-sm text-destructive">Bild-Upload: {imageUploadError}</p>}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={!canSaveDraft || saving || sending}
            >
              {saving ? (
                "Speichern..."
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Entwurf speichern
                </>
              )}
            </Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!canSend || sending || saving}
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
          <Card className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-hidden">
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle className="text-base">Vorschau</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0 overflow-y-auto">
              <div className="border-t">
                <EmailPreview html={previewHtml} />
              </div>
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
