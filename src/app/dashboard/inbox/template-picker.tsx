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
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Viewport-relative position for the dropdown. We render with
  // position: fixed because the editor toolbar lives inside the
  // compose pane's overflow-y-auto scroll container, which clips
  // horizontal overflow too. Anchored to the trigger's getBoundingClientRect,
  // recomputed on resize and scroll while open. Horizontally we
  // prefer left-anchoring (popup left edge = trigger left), but if
  // that would overflow the right viewport edge we shift the popup
  // left to fit, with an 8px margin on each side. So this works
  // whether the trigger sits at the left or right of a narrow pane.
  const POPUP_WIDTH = 320;
  const POPUP_MAX_HEIGHT = 320;
  const VIEWPORT_MARGIN = 8;
  const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(null);

  const positionPopup = () => {
    const btn = triggerRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Horizontal: left-anchor by default, shift left if it would
    // overflow the right edge.
    let left = rect.left;
    if (left + POPUP_WIDTH + VIEWPORT_MARGIN > vw) {
      left = Math.max(VIEWPORT_MARGIN, vw - POPUP_WIDTH - VIEWPORT_MARGIN);
    }
    if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;

    // Vertical: respect the requested direction, but flip if there's
    // not enough room on that side of the trigger.
    let top: number;
    if (direction === "up") {
      top = rect.top - POPUP_MAX_HEIGHT - 4;
      if (top < VIEWPORT_MARGIN) top = rect.bottom + 4;
    } else {
      top = rect.bottom + 4;
      if (top + POPUP_MAX_HEIGHT + VIEWPORT_MARGIN > vh) {
        const flipped = rect.top - POPUP_MAX_HEIGHT - 4;
        if (flipped >= VIEWPORT_MARGIN) top = flipped;
      }
    }

    setPopupPos({ top, left });
  };

  useEffect(() => {
    if (!open) return;
    positionPopup();
    const handle = () => positionPopup();
    window.addEventListener("resize", handle);
    window.addEventListener("scroll", handle, true);
    return () => {
      window.removeEventListener("resize", handle);
      window.removeEventListener("scroll", handle, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
        ref={triggerRef}
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
      {open && popupPos && (
        <div
          style={{
            position: "fixed",
            top: popupPos.top,
            left: popupPos.left,
            width: `min(${POPUP_WIDTH}px, calc(100vw - ${VIEWPORT_MARGIN * 2}px))`,
            maxHeight: POPUP_MAX_HEIGHT,
          }}
          className="bg-white border border-gray-200 rounded-[10px] shadow-lg z-50 p-1 overflow-y-auto"
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
