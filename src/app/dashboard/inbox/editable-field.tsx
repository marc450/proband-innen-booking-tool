"use client";

import { useState, useRef, useEffect } from "react";

// Inline-editable row used in the inbox contact sidebar. Default state
// shows the label + current value. Clicking the value flips it into an
// input (or select if `options` is provided); blur or Enter commits via
// the onSave callback, Escape cancels. The parent owns the "source of
// truth" value and applies the optimistic update + server sync.

type OptionItem = string | { value: string; label: string };

interface Props {
  label: string;
  value: string | null;
  onSave: (next: string | null) => Promise<void> | void;
  placeholder?: string;
  type?: "text" | "email" | "tel" | "date";
  readOnly?: boolean;
  multiline?: boolean;
  options?: OptionItem[];
}

function optionValue(o: OptionItem): string {
  return typeof o === "string" ? o : o.value;
}
function optionLabel(o: OptionItem): string {
  return typeof o === "string" ? o : o.label;
}

export function EditableField({
  label,
  value,
  onSave,
  placeholder = "",
  type = "text",
  readOnly = false,
  multiline = false,
  options,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null);

  useEffect(() => {
    if (!editing) setDraft(value ?? "");
  }, [value, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
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

  const renderEditor = () => {
    if (options) {
      return (
        <select
          ref={(el) => { inputRef.current = el; }}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            // Auto-commit on select change
            const next = e.target.value.trim() === "" ? null : e.target.value.trim();
            if (next !== (value ?? null)) onSave(next);
            setEditing(false);
          }}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => { if (e.key === "Escape") cancel(); }}
          className="w-full text-sm border border-[#0066FF] rounded px-2 py-1 outline-none bg-white"
        >
          <option value="">Bitte wählen...</option>
          {options.map((opt) => (
            <option key={optionValue(opt)} value={optionValue(opt)}>
              {optionLabel(opt)}
            </option>
          ))}
        </select>
      );
    }

    if (multiline) {
      return (
        <textarea
          ref={(el) => { inputRef.current = el; }}
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
      );
    }

    return (
      <input
        ref={(el) => { inputRef.current = el; }}
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
    );
  };

  // When options carry a display label distinct from the stored value,
  // show the label in read mode instead of the raw value.
  const displayValue = (() => {
    if (!value) return null;
    if (!options) return value;
    const match = options.find((o) => optionValue(o) === value);
    return match ? optionLabel(match) : value;
  })();

  return (
    <div className="py-2">
      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      {editing && !readOnly ? (
        renderEditor()
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
          {displayValue || placeholder || "–"}
        </button>
      )}
    </div>
  );
}
