"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Underline, Link as LinkIcon, List, ListOrdered, Indent, Outdent, RemoveFormatting, ChevronDown } from "lucide-react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
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
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const latestHtmlRef = useRef<string | null>(null);
  const [showFontSize, setShowFontSize] = useState(false);
  const fontSizeRef = useRef<HTMLDivElement>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const linkRef = useRef<HTMLDivElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);

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
    if (!showFontSize && !showLinkInput) return;
    const handler = (e: MouseEvent) => {
      if (showFontSize && fontSizeRef.current && !fontSizeRef.current.contains(e.target as Node)) {
        setShowFontSize(false);
      }
      if (showLinkInput && linkRef.current && !linkRef.current.contains(e.target as Node)) {
        setShowLinkInput(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFontSize, showLinkInput]);

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
