"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileText, Loader2 } from "lucide-react";
import { resolveTemplateVars } from "@/lib/template-vars";

// Compose-time picker for `email_templates`. Lazy-loads the list on first
// open, then resolves `{{vorname}}` against the recipient's contact
// record before handing the template back to the parent. Token resolution
// uses /api/inbox/contact, so unknown emails leave the literal token in
// place and the user can fill it in by hand.

interface Template {
  id: string;
  name: string;
  subject: string;
  body_html: string;
}

export interface PickedTemplate {
  templateId: string;
  templateName: string;
  subject: string;
  bodyHtml: string;
  vorname: string | null;
  vornameMissing: boolean;
}

interface Props {
  recipientEmail: string;
  onPick: (picked: PickedTemplate) => void;
  // "up" places the menu above the trigger (e.g. when the trigger is on
  // a sticky bottom toolbar); "down" opens it below.
  direction?: "up" | "down";
  className?: string;
  // Visual variant: "default" matches the other compose-toolbar buttons,
  // "chip" is a slim pill used inline above the body editor on mobile.
  variant?: "default" | "chip";
}

export function TemplatePicker({
  recipientEmail,
  onPick,
  direction = "up",
  className = "",
  variant = "default",
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const ensureLoaded = async () => {
    if (templates !== null) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/inbox/templates");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Vorlagen konnten nicht geladen werden.");
        setTemplates([]);
        return;
      }
      setTemplates(data);
    } catch {
      setError("Netzwerkfehler beim Laden der Vorlagen.");
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleToggle = () => {
    if (!open) void ensureLoaded();
    setOpen(!open);
  };

  const handlePick = async (t: Template) => {
    setPicking(true);
    let vorname: string | null = null;
    const email = recipientEmail.trim().toLowerCase();
    if (email && /\S+@\S+\.\S+/.test(email)) {
      try {
        const res = await fetch(
          `/api/inbox/contact?email=${encodeURIComponent(email)}`,
        );
        if (res.ok) {
          const data = await res.json().catch(() => null);
          const fn = data?.contact?.firstName;
          if (typeof fn === "string" && fn.trim()) vorname = fn.trim();
        }
      } catch {
        // Fail soft — treat as unknown contact, leave token in place.
      }
    }
    const subject = resolveTemplateVars(t.subject || "", { vorname });
    const bodyHtml = resolveTemplateVars(t.body_html || "", { vorname });
    const stillHasToken = /\{\{\s*vorname\s*\}\}/i.test(subject + bodyHtml);
    onPick({
      templateId: t.id,
      templateName: t.name,
      subject,
      bodyHtml,
      vorname,
      vornameMissing: stillHasToken,
    });
    setPicking(false);
    setOpen(false);
  };

  const triggerClass =
    variant === "chip"
      ? "inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-xs font-medium disabled:opacity-50"
      : "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-gray-600 hover:bg-gray-100 transition-colors text-sm disabled:opacity-50";

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={picking}
        title="Vorlage einfügen"
        className={triggerClass}
      >
        {picking ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileText className="h-3.5 w-3.5" />
        )}
        <span>Vorlage</span>
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div
          className={`absolute ${
            direction === "up" ? "bottom-full mb-1" : "top-full mt-1"
          } left-0 bg-white border border-gray-200 rounded-[10px] shadow-lg z-50 p-1 min-w-[280px] max-w-[380px] max-h-[320px] overflow-y-auto`}
        >
          {loading && (
            <div className="flex items-center justify-center py-4 text-xs text-gray-500">
              <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
              Lade...
            </div>
          )}
          {!loading && error && (
            <p className="text-xs text-red-600 px-3 py-2">{error}</p>
          )}
          {!loading && !error && templates && templates.length === 0 && (
            <p className="text-xs text-gray-500 px-3 py-3">
              Noch keine Vorlagen vorhanden. Lege welche unter Einstellungen → E-Mail Vorlagen an.
            </p>
          )}
          {!loading && !error && templates && templates.length > 0 && (
            <div className="flex flex-col">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => void handlePick(t)}
                  className="text-left px-3 py-2 rounded-[8px] hover:bg-gray-50 transition-colors"
                >
                  <div className="text-sm font-medium text-gray-800 truncate">
                    {t.name}
                  </div>
                  {t.subject && (
                    <div className="text-xs text-gray-500 truncate mt-0.5">
                      {t.subject}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
