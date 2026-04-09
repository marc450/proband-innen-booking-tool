"use client";

import { useEffect, useRef } from "react";
import { Bold, Italic, Underline, Link as LinkIcon, List, ListOrdered, Indent, Outdent } from "lucide-react";

// Minimal contenteditable editor. Deliberately small surface so we don't
// pull in a full editor library like Tiptap. Supports the basics the
// customerlove inbox actually uses: bold, italic, underline, lists, links.
// The caller owns the HTML string; we push an updated string on every
// input event via onChange.

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

function exec(command: string, value?: string) {
  // document.execCommand is deprecated but remains the simplest way to get
  // rich text without a dependency. All major browsers still support it
  // and the alternative (Selection/Range manipulation) is much more code.
  document.execCommand(command, false, value);
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  autoFocus,
  className = "",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // Initialise to null (not `value`) so the first useEffect run always
  // pushes `value` into the DOM — otherwise the editor mounts with an
  // empty div even when the caller passes a non-empty initial value
  // (e.g. the email signature).
  const latestHtmlRef = useRef<string | null>(null);

  // Only push the HTML string into the DOM when it differs from what we
  // last emitted. Without this guard, every keystroke re-syncs the DOM
  // from props and the caret jumps to the start on each character.
  useEffect(() => {
    if (ref.current && value !== latestHtmlRef.current) {
      ref.current.innerHTML = value;
      latestHtmlRef.current = value;
    }
  }, [value]);

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
      // Place caret at the end so the user can start typing immediately
      // above an auto-inserted signature.
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      range.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [autoFocus]);

  const handleInput = () => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    latestHtmlRef.current = html;
    onChange(html);
  };

  const handleLink = () => {
    const url = prompt("Link-URL:");
    if (url) exec("createLink", url);
  };

  return (
    <div className={`border border-gray-200 rounded-[10px] bg-white flex flex-col ${className}`}>
      <div className="flex items-center gap-1 border-b border-gray-100 px-2 py-1.5">
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
  // Using onMouseDown + preventDefault keeps the editor selection alive
  // when the user clicks a toolbar button. A regular onClick would blur
  // the editor first, wiping the selection before execCommand runs.
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
