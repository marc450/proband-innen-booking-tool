"use client";

import { useState, useRef, useEffect } from "react";

// Inline-editable row used in the inbox contact sidebar. Default state
// shows the label + current value. Clicking the value flips it into an
// input; blur or Enter commits via the onSave callback, Escape cancels.
// The parent owns the "source of truth" value and applies the optimistic
// update + server sync.

interface Props {
  label: string;
  value: string | null;
  onSave: (next: string | null) => Promise<void> | void;
  placeholder?: string;
  type?: "text" | "email" | "tel" | "date";
  readOnly?: boolean;
  multiline?: boolean;
}

export function EditableField({
  label,
  value,
  onSave,
  placeholder = "",
  type = "text",
  readOnly = false,
  multiline = false,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!editing) setDraft(value ?? "");
  }, [value, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if ("select" in inputRef.current) inputRef.current.select();
    }
  }, [editing]);

  const commit = async () => {
    const next = draft.trim() === "" ? null : draft.trim();
    if (next !== (value ?? null)) {
      await onSave(next);
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value ?? "");
    setEditing(false);
  };

  return (
    <div className="py-2">
      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      {editing && !readOnly ? (
        multiline ? (
          <textarea
            ref={(el) => {
              inputRef.current = el;
            }}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancel();
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
            }}
            rows={3}
            className="w-full text-sm border border-[#0066FF] rounded px-2 py-1.5 outline-none resize-y"
          />
        ) : (
          <input
            ref={(el) => {
              inputRef.current = el;
            }}
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancel();
              if (e.key === "Enter") commit();
            }}
            className="w-full text-sm border border-[#0066FF] rounded px-2 py-1 outline-none"
          />
        )
      ) : (
        <button
          type="button"
          onClick={() => !readOnly && setEditing(true)}
          disabled={readOnly}
          className={`w-full text-left text-sm rounded px-2 py-1 -mx-2 truncate ${
            readOnly
              ? "cursor-default text-gray-900"
              : "hover:bg-gray-50 cursor-text text-gray-900"
          } ${!value ? "text-gray-400 italic" : ""}`}
        >
          {value || placeholder || "–"}
        </button>
      )}
    </div>
  );
}
