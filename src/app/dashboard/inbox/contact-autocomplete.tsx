"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

interface ContactResult {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  title: string | null;
  companyName: string | null;
}

interface Props {
  /**
   * The value stored upstream. Accepted as a comma-/semicolon-separated
   * recipient string (the historical format) so existing draft code keeps
   * working without changes; internally it's parsed into chips.
   */
  value: string;
  /**
   * Reports the current value back as a comma-separated string (the same
   * format the backend /api/gmail/send already expects).
   */
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

const EMAIL_RE = /^[^\s@,<>"']+@[^\s@,<>"']+\.[^\s@,<>"']+$/;

/**
 * A fragment is only safe to auto-commit as a chip when it contains an "@".
 * Without this guard, mobile keyboards (iOS QuickType / Smart Punctuation)
 * that helpfully insert a comma between words would turn each typed letter
 * into its own chip. Name fragments (no "@") must stay in the input until
 * the user picks a contact from the dropdown, presses Enter on a complete
 * email, or types past an "@".
 */
function looksLikeEmail(fragment: string): boolean {
  return fragment.includes("@");
}

function parseRecipients(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function joinRecipients(list: string[]): string {
  return list.join(", ");
}

export function ContactAutocomplete({
  value,
  onChange,
  placeholder = "Name oder E-Mail eingeben...",
  className,
  autoFocus,
}: Props) {
  // Chips = the already-selected recipients. Split out cleanly so the
  // user can edit each independently (remove via X, backspace-to-remove-
  // last, Enter/comma to commit the current text as a chip).
  const [chips, setChips] = useState<string[]>(() => parseRecipients(value));
  const [input, setInput] = useState("");
  const [results, setResults] = useState<ContactResult[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Report chips (plus the current unsubmitted input fragment) upstream as
  // a comma-separated string. The input fragment is included so that
  // pressing "Send" without having committed the last token (e.g. the
  // user typed a full email and clicked Send without pressing Enter) still
  // ships that recipient — /api/gmail/send trims/normalises so trailing
  // commas or empty fragments are harmless.
  const reportUp = useMemo(
    () => (list: string[], tail: string) => {
      const parts = [...list];
      if (tail.trim()) parts.push(tail.trim());
      onChange(joinRecipients(parts));
    },
    [onChange],
  );

  // Keep internal state in sync when `value` is set externally (e.g. draft
  // restore, programmatic clear on send).
  useEffect(() => {
    const parsed = parseRecipients(value);
    // Compare against the current chips; if they match, don't reset the
    // input (otherwise typing would get clobbered on every keystroke
    // because onChange → setValue → useEffect → setChips).
    if (
      parsed.length === chips.length &&
      parsed.every((p, i) => p === chips[i])
    ) {
      return;
    }
    setChips(parsed);
    setInput("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const search = (token: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = token.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/contact-search?q=${encodeURIComponent(q)}&limit=8`,
        );
        if (!res.ok) return;
        const data: ContactResult[] = await res.json();
        setResults(data);
        setOpen(data.length > 0);
        setActiveIndex(-1);
      } catch {
        /* best effort */
      }
    }, 200);
  };

  const handleInputChange = (raw: string) => {
    // Commit-on-separator: only when the fragment actually contains "@".
    // iOS QuickType / Smart Punctuation cheerfully inserts commas between
    // typed words, which would otherwise turn "Wyss" into four chips
    // ("W,Y,S,S"). Name-only fragments must stay in the input; we just
    // strip the stray separators silently.
    if (/[,;]/.test(raw)) {
      const parts = raw.split(/[,;]/);
      const committed: string[] = [];
      const leftover: string[] = [];
      for (let i = 0; i < parts.length - 1; i++) {
        const t = parts[i].trim();
        if (!t) continue;
        if (looksLikeEmail(t)) committed.push(t);
        else leftover.push(t);
      }
      const tail = [...leftover, parts[parts.length - 1]].join(" ").trimStart();
      if (committed.length > 0) {
        const next = [...chips, ...committed];
        setChips(next);
        setInput(tail);
        reportUp(next, tail);
        search(tail);
        return;
      }
      // No email-like fragments found — treat the whole thing as the input
      // and strip the stray separators so the user keeps typing naturally.
      const cleaned = raw.replace(/[,;]+/g, " ").replace(/ {2,}/g, " ");
      setInput(cleaned);
      reportUp(chips, cleaned);
      search(cleaned);
      return;
    }
    setInput(raw);
    reportUp(chips, raw);
    search(raw);
  };

  const addChip = (email: string) => {
    const trimmed = email.trim().replace(/[,;]+$/, "");
    if (!trimmed) return;
    const next = chips.includes(trimmed) ? chips : [...chips, trimmed];
    setChips(next);
    setInput("");
    reportUp(next, "");
    setOpen(false);
    setResults([]);
    inputRef.current?.focus();
  };

  const removeChip = (index: number) => {
    const next = chips.filter((_, i) => i !== index);
    setChips(next);
    reportUp(next, input);
    inputRef.current?.focus();
  };

  const selectContact = (contact: ContactResult) => {
    addChip(contact.email);
  };

  const commitCurrentInput = (): boolean => {
    // Prefer the highlighted autocomplete result when there is one.
    if (activeIndex >= 0 && results[activeIndex]) {
      selectContact(results[activeIndex]);
      return true;
    }
    const t = input.trim();
    if (!t) return false;
    // Refuse to chipify a fragment that doesn't look like an email. The
    // user probably typed a name; let them keep typing or pick from the
    // dropdown. Accept "Name <a@b.c>" (browser autofill) as-is because it
    // contains "@". /api/gmail/send re-validates downstream.
    if (!looksLikeEmail(t)) return false;
    addChip(t);
    return true;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Backspace on empty input removes the last chip.
    if (e.key === "Backspace" && input === "" && chips.length > 0) {
      e.preventDefault();
      removeChip(chips.length - 1);
      return;
    }

    if (open && results.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i < results.length - 1 ? i + 1 : 0));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i > 0 ? i - 1 : results.length - 1));
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
    }

    // Commit keys: Enter, Tab, comma, semicolon (comma+semicolon are also
    // handled in handleInputChange for the case where they arrive via
    // autofill/paste rather than a direct keystroke).
    if (e.key === "Enter" || e.key === "Tab" || e.key === "," || e.key === ";") {
      if (commitCurrentInput()) {
        e.preventDefault();
      }
    }
  };

  // Clicking anywhere in the chip row focuses the input (standard chip UX).
  const focusInput = () => inputRef.current?.focus();

  // Close dropdown on outside click.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        // Only commit a half-typed entry when it looks like an email —
        // a stray name fragment must not become a chip on outside click.
        if (input.trim() && looksLikeEmail(input)) {
          addChip(input);
        }
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, chips]);

  const formatName = (c: ContactResult) => {
    const parts = [c.title, c.firstName, c.lastName].filter(Boolean);
    return parts.join(" ") || c.email;
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex-1 min-h-[2.25rem] border border-input rounded-md bg-transparent px-2 py-1 flex flex-wrap items-center gap-1.5 cursor-text focus-within:ring-2 focus-within:ring-ring/50 ${className ?? ""}`}
      onClick={focusInput}
    >
      {chips.map((email, i) => (
        <span
          key={`${email}-${i}`}
          className="inline-flex items-center gap-1 bg-gray-100 text-gray-900 text-sm rounded-full pl-2.5 pr-1 py-0.5"
        >
          <span>{email}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeChip(i);
            }}
            className="p-0.5 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors"
            aria-label={`${email} entfernen`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (results.length > 0) setOpen(true);
        }}
        onBlur={() => {
          // Commit a dangling typed email on blur so clicking "Send"
          // doesn't silently drop the last recipient. Only emails — a
          // name fragment would be a false positive on mobile keyboards.
          if (input.trim() && looksLikeEmail(input)) addChip(input);
        }}
        placeholder={chips.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm py-1"
        autoFocus={autoFocus}
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-[240px] overflow-y-auto">
          {results.map((contact, i) => (
            <button
              key={contact.id}
              type="button"
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex flex-col gap-0.5 transition-colors ${
                i === activeIndex ? "bg-gray-50" : ""
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                selectContact(contact);
              }}
            >
              <span className="font-medium text-gray-900">
                {formatName(contact)}
              </span>
              <span className="text-xs text-gray-500">{contact.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
