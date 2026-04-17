"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

interface ContactResult {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  title: string | null;
  companyName: string | null;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function ContactAutocomplete({
  value,
  onChange,
  placeholder = "Name oder E-Mail eingeben...",
  className,
  autoFocus,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ContactResult[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // When value is set externally (e.g. draft restore), sync the visible input
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Extract the "current token" the user is typing — the fragment after the
  // last recipient separator. Supports the standard email list delimiters:
  // comma, semicolon, and whitespace (tab/newline for paste, spaces after a
  // full "Name <foo@bar>" block). Everything before that is already-entered
  // recipients and should be left alone.
  const tokenBoundary = (raw: string): { prefix: string; token: string } => {
    const match = raw.match(/[,;\s]/g);
    if (!match) return { prefix: "", token: raw };
    const lastSep = Math.max(
      raw.lastIndexOf(","),
      raw.lastIndexOf(";"),
      raw.lastIndexOf(" "),
      raw.lastIndexOf("\t"),
      raw.lastIndexOf("\n"),
    );
    return {
      prefix: raw.slice(0, lastSep + 1),
      token: raw.slice(lastSep + 1),
    };
  };

  const search = (rawValue: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const { token } = tokenBoundary(rawValue);
    const q = token.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/contact-search?q=${encodeURIComponent(q)}&limit=8`
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
    setQuery(raw);
    onChange(raw);
    search(raw);
  };

  const selectContact = (contact: ContactResult) => {
    // Replace only the fragment the user is currently typing, preserving
    // any recipients they already entered before the last separator. Add
    // a trailing ", " so the next recipient can be typed straight away.
    const { prefix } = tokenBoundary(query);
    const normalisedPrefix = prefix.replace(/[,;\s]+$/, "");
    const next = normalisedPrefix
      ? `${normalisedPrefix}, ${contact.email}, `
      : `${contact.email}, `;
    onChange(next);
    setQuery(next);
    setOpen(false);
    setResults([]);
    // Keep focus in the input so the user can immediately type the next name
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i < results.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i > 0 ? i - 1 : results.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectContact(results[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const formatName = (c: ContactResult) => {
    const parts = [c.title, c.firstName, c.lastName].filter(Boolean);
    return parts.join(" ") || c.email;
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (results.length > 0) setOpen(true);
        }}
        placeholder={placeholder}
        className={className}
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
