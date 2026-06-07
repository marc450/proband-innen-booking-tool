"use client";

// Small rich-text field for the LMS block editor. Backed by TipTap but
// locked down to exactly the inline formatting the reader's renderer
// supports: bold, italic, link. Everything else StarterKit ships
// (headings, lists, underline, strike, code, hard breaks, …) is disabled
// so the field can never emit a node/mark the renderer would drop.
//
// TipTap lives only in this admin editor. The public reader (renderer.tsx)
// stays free of any editor runtime.
import { useState, useCallback } from "react";
import { useEditor, EditorContent, type Content } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, Link as LinkIcon, X } from "lucide-react";

// Loose TipTap node shape used across the editor. The renderer's strict
// TipTapNode union is enforced at save time by the validator, so the
// editor internals work with this structural type to avoid fighting the
// discriminated union while building nodes dynamically.
export type RtNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: RtNode[];
  text?: string;
  marks?: unknown[];
};

type Mode = "inline" | "multiline";

function toDoc(value: RtNode[], mode: Mode) {
  if (mode === "inline") {
    return { type: "doc", content: [{ type: "paragraph", content: value }] };
  }
  return {
    type: "doc",
    content: value.length > 0 ? value : [{ type: "paragraph" }],
  };
}

// Read the editor JSON back into the block's stored shape.
function fromEditor(json: { content?: RtNode[] }, mode: Mode): RtNode[] {
  const content = json.content ?? [];
  if (mode === "inline") {
    // Flatten every paragraph's inline content into a single inline run.
    return content.flatMap((n) =>
      n.type === "paragraph" && Array.isArray(n.content) ? (n.content ?? []) : [],
    );
  }
  return content;
}

export function RichTextField({
  value,
  onChange,
  mode = "inline",
  placeholder,
  className,
}: {
  value: RtNode[];
  onChange: (nodes: RtNode[]) => void;
  mode?: Mode;
  placeholder?: string;
  className?: string;
}) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        strike: false,
        horizontalRule: false,
        underline: false,
        hardBreak: false,
        trailingNode: false,
        link: { openOnClick: false, autolink: false },
      }),
    ],
    content: toDoc(value, mode) as unknown as Content,
    onUpdate: ({ editor }) => {
      onChange(fromEditor(editor.getJSON() as { content?: RtNode[] }, mode));
    },
    editorProps: {
      attributes: {
        class:
          "lms-rt prose-none outline-none min-h-[2.25rem] px-3 py-2 text-sm leading-relaxed",
      },
    },
  });

  const applyLink = useCallback(() => {
    if (!editor) return;
    const url = linkUrl.trim();
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setLinkOpen(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  if (!editor) {
    return (
      <div className="rounded-md border border-input bg-muted/30 min-h-[2.5rem]" />
    );
  }

  const btn = (active: boolean) =>
    `inline-flex items-center justify-center h-7 w-7 rounded transition-colors ${
      active ? "bg-[#0066FF] text-white" : "text-muted-foreground hover:bg-black/5"
    }`;

  return (
    <div className={`rounded-md border border-input bg-white ${className ?? ""}`}>
      <div className="flex items-center gap-0.5 border-b px-1.5 py-1">
        <button type="button" className={btn(editor.isActive("bold"))} title="Fett"
          onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={btn(editor.isActive("italic"))} title="Kursiv"
          onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={btn(editor.isActive("link") || linkOpen)}
          title="Link"
          onClick={() => {
            const prev = (editor.getAttributes("link").href as string) || "";
            setLinkUrl(prev);
            setLinkOpen((v) => !v);
          }}
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </button>
        {linkOpen && (
          <div className="flex items-center gap-1 ml-1 flex-1">
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); applyLink(); }
                if (e.key === "Escape") { setLinkOpen(false); setLinkUrl(""); }
              }}
              autoFocus
              placeholder="https://… (leer = Link entfernen)"
              className="flex-1 h-7 text-xs px-2 rounded border border-input"
            />
            <button type="button" className="text-xs px-2 h-7 rounded bg-[#0066FF] text-white" onClick={applyLink}>
              OK
            </button>
            <button type="button" className="h-7 w-7 inline-flex items-center justify-center text-muted-foreground hover:bg-black/5 rounded"
              onClick={() => { setLinkOpen(false); setLinkUrl(""); }}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
      <EditorContent editor={editor} />
      {placeholder && editor.isEmpty && (
        <div className="px-3 pb-2 -mt-7 text-sm text-muted-foreground pointer-events-none">
          {placeholder}
        </div>
      )}
    </div>
  );
}
