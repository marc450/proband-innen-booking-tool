"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Underline, Link as LinkIcon, List, ListOrdered, Indent, Outdent, RemoveFormatting, ChevronDown, Smile, Sparkles, Loader2 } from "lucide-react";

// Curated emoji palette for the toolbar picker. The set is small on
// purpose — the goal is a one-click "drop a smiley into a customer
// email" experience, not a full Unicode browser. Mobile users get the
// native OS picker via the on-screen keyboard, so this button is
// hidden below the md breakpoint.
const EMOJIS: string[] = [
  // Smileys
  "😊", "😄", "😉", "🙂", "😇", "😍", "🥰", "😎",
  "🤔", "😅", "😂", "🤩", "😢", "🥺", "😴", "🤗",
  // Gestures
  "👋", "👍", "👎", "🙌", "🙏", "💪", "✋", "👌",
  "🤝", "✊", "🫶", "🫡", "🤲", "✍️", "👀", "👏",
  // Love / sparkle
  "❤️", "💙", "💚", "💛", "💜", "🧡", "🤍", "🩷",
  "✨", "💖", "💕", "💗", "💞", "⭐", "🌟", "💫",
  // Celebration / nature
  "🎉", "🎊", "🥳", "🎈", "🎁", "🍾", "🌸", "🌷",
  // Status / energy
  "✅", "❌", "⚠️", "💡", "🔥", "💯", "⚡", "🚀",
  // EPHIA-context
  "💉", "🩺", "⚕️", "📅", "⏰", "📧", "📞", "🏥",
];

// Context the AI-draft button needs to call /api/inbox/ai-draft. Provided
// by the parent so the button can ship recipient + thread context to the
// model without the editor having to know about Gmail or contacts.
export interface AIDraftContext {
  to: string;
  subject: string;
  threadId?: string | null;
  // The signature HTML is appended automatically after the AI body, and
  // the editor strips it out of the "current draft" sent to the model so
  // the AI never sees "Beste Grüße, Marc" as part of the draft to refine.
  signatureHtml?: string;
  userName?: string;
  // "email" (default) drafts an actual mail to a known recipient with
  // contact + thread context. "template" drafts a reusable Vorlage in
  // the templates editor: no contact lookup, no signature, AI is told
  // to use {{vorname}} where personalisation belongs.
  mode?: "email" | "template";
}

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  aiContext?: AIDraftContext;
}

function exec(command: string, value?: string) {
  document.execCommand(command, false, value);
}

// Strip inline styles from pasted HTML but keep structural formatting
function cleanPastedHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");

  // Walk all elements and remove style attributes + unwanted tags
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
  const toRemove: Element[] = [];

  while (walker.nextNode()) {
    const el = walker.currentNode as Element;
    // Remove all style attributes (font-size, color, font-family, etc.)
    el.removeAttribute("style");
    el.removeAttribute("class");
    // Remove font tags (legacy formatting)
    if (el.tagName === "FONT") {
      toRemove.push(el);
    }
  }

  // Unwrap font tags (keep their children)
  for (const el of toRemove) {
    while (el.firstChild) {
      el.parentNode?.insertBefore(el.firstChild, el);
    }
    el.parentNode?.removeChild(el);
  }

  return doc.body.innerHTML;
}

const FONT_SIZES = [
  { label: "Klein", value: "1" },
  { label: "Normal", value: "3" },
  { label: "Groß", value: "5" },
  { label: "Überschrift", value: "6" },
];

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  autoFocus,
  className = "",
  aiContext,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const latestHtmlRef = useRef<string | null>(null);
  const [showFontSize, setShowFontSize] = useState(false);
  const fontSizeRef = useRef<HTMLDivElement>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const linkRef = useRef<HTMLDivElement>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const [showAi, setShowAi] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiRef = useRef<HTMLDivElement>(null);
  const aiButtonRef = useRef<HTMLButtonElement>(null);
  // Viewport-relative position for the AI popup. We use position: fixed
  // because the compose pane scrolls inside an overflow-y-auto container
  // which implicitly clips horizontal overflow too — an absolutely
  // positioned popup gets cut off as soon as it extends past the
  // scroller's edges. Fixed positioning escapes the clip; we just need
  // to recompute on resize / scroll while open.
  const [aiPopupPos, setAiPopupPos] = useState<{ top: number; right: number } | null>(null);

  const positionAiPopup = () => {
    const btn = aiButtonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setAiPopupPos({
      top: rect.bottom + 4,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  };

  useEffect(() => {
    if (!showAi) return;
    positionAiPopup();
    const handle = () => positionAiPopup();
    window.addEventListener("resize", handle);
    window.addEventListener("scroll", handle, true);
    return () => {
      window.removeEventListener("resize", handle);
      window.removeEventListener("scroll", handle, true);
    };
  }, [showAi]);

  useEffect(() => {
    if (ref.current && value !== latestHtmlRef.current) {
      ref.current.innerHTML = value;
      latestHtmlRef.current = value;
    }
  }, [value]);

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      range.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [autoFocus]);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!showFontSize && !showLinkInput && !showEmoji && !showAi) return;
    const handler = (e: MouseEvent) => {
      if (showFontSize && fontSizeRef.current && !fontSizeRef.current.contains(e.target as Node)) {
        setShowFontSize(false);
      }
      if (showLinkInput && linkRef.current && !linkRef.current.contains(e.target as Node)) {
        setShowLinkInput(false);
      }
      if (showEmoji && emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
      if (showAi && aiRef.current && !aiRef.current.contains(e.target as Node) && !aiBusy) {
        setShowAi(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFontSize, showLinkInput, showEmoji, showAi, aiBusy]);

  const handleInput = () => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    latestHtmlRef.current = html;
    onChange(html);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const clipboardHtml = e.clipboardData.getData("text/html");
    const clipboardText = e.clipboardData.getData("text/plain");

    if (clipboardHtml) {
      // Paste HTML with styles stripped
      const clean = cleanPastedHtml(clipboardHtml);
      document.execCommand("insertHTML", false, clean);
    } else if (clipboardText) {
      // Plain text — insert as-is
      document.execCommand("insertText", false, clipboardText);
    }
    handleInput();
  };

  const handleLinkOpen = () => {
    // Save the current selection so we can restore it when inserting the link
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    }
    setLinkUrl("");
    setShowLinkInput(true);
  };

  const handleLinkInsert = () => {
    const url = linkUrl.trim();
    if (!url) { setShowLinkInput(false); return; }
    // Restore selection
    const sel = window.getSelection();
    if (savedSelectionRef.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedSelectionRef.current);
    }
    exec("createLink", url);
    setShowLinkInput(false);
    handleInput();
  };

  const handleFontSize = (size: string) => {
    exec("fontSize", size);
    setShowFontSize(false);
    // Refocus editor
    ref.current?.focus();
  };

  const handleRemoveFormatting = () => {
    exec("removeFormat");
    // Also remove font size tags
    exec("fontSize", "3");
    ref.current?.focus();
  };

  const handleEmojiOpen = () => {
    // Save the cursor position so the emoji ends up where the user
    // was typing, even though clicking the toolbar moves focus.
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    }
    setShowEmoji((v) => !v);
  };

  // Strip the auto-appended signature from the body before sending to the
  // model. The composer initialises the body with `<br><br>${signatureHtml}`,
  // so we look for that suffix and remove it. If the user edited the
  // signature region we leave it alone (better to over-include than miss).
  const stripSignature = (html: string): string => {
    const sig = aiContext?.signatureHtml;
    if (!sig) return html;
    const candidates = [`<br><br>${sig}`, `<br/><br/>${sig}`, sig];
    for (const c of candidates) {
      if (html.endsWith(c)) return html.slice(0, html.length - c.length);
    }
    return html;
  };

  const stripVisibleHtml = (html: string) =>
    html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim();

  const handleAiOpen = () => {
    setAiError(null);
    setAiInstruction("");
    setShowAi(true);
  };

  const handleAiSubmit = async () => {
    if (!aiContext) return;
    const instruction = aiInstruction.trim();
    if (!instruction || aiBusy) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const currentDraft = stripSignature(value);
      const res = await fetch("/api/inbox/ai-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: aiContext.to,
          subject: aiContext.subject,
          threadId: aiContext.threadId || null,
          instruction,
          currentDraft,
          userName: aiContext.userName,
          mode: aiContext.mode || "email",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        html?: string;
        error?: string;
      };
      if (!res.ok || !data.html) {
        setAiError(data.error || `Fehler (HTTP ${res.status})`);
        setAiBusy(false);
        return;
      }
      // The AI body ends with </p>, which already gives a paragraph
      // bottom margin. Adding two <br>s on top of that produces a
      // visibly extra blank line before the signature — use a single
      // <br> so the gap matches a normal hand-typed body.
      const sigSuffix = aiContext.signatureHtml
        ? `<br>${aiContext.signatureHtml}`
        : "";
      onChange(data.html + sigSuffix);
      setShowAi(false);
      setAiInstruction("");
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Netzwerkfehler");
    } finally {
      setAiBusy(false);
    }
  };

  const handleEmojiInsert = (emoji: string) => {
    ref.current?.focus();
    const sel = window.getSelection();
    if (savedSelectionRef.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedSelectionRef.current);
    }
    document.execCommand("insertText", false, emoji);
    setShowEmoji(false);
    handleInput();
  };

  return (
    <div className={`border border-gray-200 rounded-[10px] bg-white flex flex-col ${className}`}>
      <div className="flex items-center gap-1 border-b border-gray-100 px-2 py-1.5 flex-wrap">
        <ToolbarButton onClick={() => exec("bold")} title="Fett (Ctrl+B)">
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("italic")} title="Kursiv (Ctrl+I)">
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("underline")} title="Unterstrichen">
          <Underline className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-gray-200 mx-1" />

        {/* Font size dropdown */}
        <div ref={fontSizeRef} className="relative">
          <button
            type="button"
            title="Schriftgröße"
            onMouseDown={(e) => {
              e.preventDefault();
              setShowFontSize(!showFontSize);
            }}
            className="h-7 px-1.5 flex items-center gap-0.5 rounded hover:bg-gray-100 text-gray-600 transition-colors text-xs font-medium"
          >
            Aa
            <ChevronDown className="h-2.5 w-2.5" />
          </button>
          {showFontSize && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-[120px]">
              {FONT_SIZES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleFontSize(s.value);
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <ToolbarButton onClick={handleRemoveFormatting} title="Formatierung entfernen">
          <RemoveFormatting className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-gray-200 mx-1" />

        <ToolbarButton onClick={() => exec("insertUnorderedList")} title="Aufzählung">
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("insertOrderedList")} title="Nummerierte Liste">
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-gray-200 mx-1" />
        <ToolbarButton onClick={() => exec("outdent")} title="Einzug verkleinern">
          <Outdent className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("indent")} title="Einzug vergrößern">
          <Indent className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-gray-200 mx-1" />
        {/* Emoji picker — desktop-only. Mobile uses the OS keyboard. */}
        <div ref={emojiRef} className="relative hidden md:block">
          <ToolbarButton onClick={handleEmojiOpen} title="Emoji einfügen">
            <Smile className="h-3.5 w-3.5" />
          </ToolbarButton>
          {showEmoji && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2 w-[272px]">
              <div className="grid grid-cols-8 gap-0.5">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onMouseDown={(evt) => {
                      evt.preventDefault();
                      handleEmojiInsert(e);
                    }}
                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-gray-100 text-base leading-none transition-colors"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {aiContext && (
          <>
            <div ref={aiRef} className="relative">
              <button
                ref={aiButtonRef}
                type="button"
                title={
                  stripVisibleHtml(stripSignature(value))
                    ? "Mit KI verfeinern"
                    : "Mit KI verfassen"
                }
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (showAi) {
                    setShowAi(false);
                  } else {
                    handleAiOpen();
                  }
                }}
                className="h-7 px-1.5 flex items-center gap-1 rounded text-[#0066FF] hover:bg-[#0066FF]/10 transition-colors text-xs font-semibold"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden md:inline">KI</span>
              </button>
              {showAi && aiPopupPos && (
                // Fixed positioning so the popup escapes the compose
                // pane's overflow-y-auto scroll container, which clips
                // horizontal overflow too. Anchored to the button's
                // viewport rect.
                <div
                  style={{
                    position: "fixed",
                    top: aiPopupPos.top,
                    right: aiPopupPos.right,
                    width: "min(340px, calc(100vw - 16px))",
                  }}
                  className="bg-white border border-gray-200 rounded-[10px] shadow-lg z-50 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="h-3.5 w-3.5 text-[#0066FF]" />
                    <span className="text-xs font-bold text-gray-700">
                      {stripVisibleHtml(stripSignature(value))
                        ? "Entwurf verfeinern"
                        : "E-Mail mit KI verfassen"}
                    </span>
                  </div>
                  <textarea
                    value={aiInstruction}
                    onChange={(e) => setAiInstruction(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        void handleAiSubmit();
                      }
                      if (e.key === "Escape" && !aiBusy) {
                        e.preventDefault();
                        setShowAi(false);
                      }
                    }}
                    placeholder={
                      stripVisibleHtml(stripSignature(value))
                        ? "z.B. kürzer, freundlicher, drei Termine vorschlagen..."
                        : "z.B. Termin bestätigen, Absage höflich formulieren..."
                    }
                    autoFocus
                    rows={3}
                    disabled={aiBusy}
                    className="w-full border border-gray-200 rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0066FF] resize-none disabled:bg-gray-50"
                  />
                  {aiError && (
                    <p className="text-xs text-red-600 mt-1.5">{aiError}</p>
                  )}
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <span className="text-[10px] text-gray-400">
                      ⌘+Enter
                    </span>
                    <button
                      type="button"
                      onClick={handleAiSubmit}
                      disabled={aiBusy || !aiInstruction.trim()}
                      className="px-3 py-1.5 bg-[#0066FF] text-white text-sm rounded-[10px] font-bold hover:bg-[#0055DD] disabled:opacity-40 transition-colors flex items-center gap-1.5"
                    >
                      {aiBusy ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Schreibt...
                        </>
                      ) : stripVisibleHtml(stripSignature(value)) ? (
                        "Verfeinern"
                      ) : (
                        "Entwerfen"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="w-px h-4 bg-gray-200 mx-1" />
          </>
        )}
        <div ref={linkRef} className="relative">
          <ToolbarButton onClick={handleLinkOpen} title="Link einfügen (⌘K)">
            <LinkIcon className="h-3.5 w-3.5" />
          </ToolbarButton>
          {showLinkInput && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3 min-w-[280px]">
              <label className="text-xs text-gray-500 mb-1 block">Link-URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleLinkInsert(); } if (e.key === "Escape") setShowLinkInput(false); }}
                  placeholder="https://..."
                  autoFocus
                  className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0066FF]"
                />
                <button
                  type="button"
                  onClick={handleLinkInsert}
                  className="px-3 py-1.5 bg-[#0066FF] text-white text-sm rounded font-medium hover:bg-[#0055DD] transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "k") {
            e.preventDefault();
            handleLinkOpen();
          }
        }}
        data-placeholder={placeholder}
        // Force Arial + the same paragraph / list spacing and link color
        // as the rendered email HTML so the composer is a true WYSIWYG
        // preview of what Gmail will show the recipient.
        style={{ fontFamily: "Arial, sans-serif" }}
        className="flex-1 px-4 py-3 text-sm leading-[1.5] outline-none overflow-y-auto min-h-[120px] max-h-[320px] [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_li]:mb-1 [&_blockquote]:pl-3 [&_blockquote]:border-l-2 [&_blockquote]:border-gray-200 [&_blockquote]:text-gray-600 [&_blockquote]:mb-2 [&_a]:text-[#0066FF] [&_a]:underline empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none"
      />
    </div>
  );
}

function ToolbarButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="h-7 w-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600 transition-colors"
    >
      {children}
    </button>
  );
}
