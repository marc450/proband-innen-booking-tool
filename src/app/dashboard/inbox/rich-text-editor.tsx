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

  // Close font size dropdown on outside click
  useEffect(() => {
    if (!showFontSize) return;
    const handler = (e: MouseEvent) => {
      if (fontSizeRef.current && !fontSizeRef.current.contains(e.target as Node)) {
        setShowFontSize(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFontSize]);

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

  const handleLink = () => {
    const url = prompt("Link-URL:");
    if (url) exec("createLink", url);
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
        <ToolbarButton onClick={handleLink} title="Link einfügen">
          <LinkIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        className="flex-1 px-4 py-3 text-sm outline-none overflow-y-auto min-h-[120px] max-h-[320px] [&_p]:mb-2 [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 [&_blockquote]:ml-6 [&_blockquote]:border-l-2 [&_blockquote]:border-gray-200 [&_blockquote]:pl-3 [&_a]:text-[#0066FF] [&_a]:underline empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none"
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
