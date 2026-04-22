"use client";

import { useMemo, useState } from "react";
import { Copy, Check, Search } from "lucide-react";

interface Props {
  emails: string[];
}

// Borderless, flat recipient list. Follows the EPHIA design system: no
// element borders, rounded-[10px] containers, primary CTA (#0066FF) for
// interactive actions.
export function RecipientList({ emails }: Props) {
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return emails;
    const q = query.toLowerCase();
    return emails.filter((e) => e.toLowerCase().includes(q));
  }, [emails, query]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(emails.join(", "));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suche..."
            className="w-full h-9 text-xs pl-8 pr-3 rounded-[10px] bg-muted/60 border-0 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/30 placeholder:text-muted-foreground"
          />
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] text-xs font-semibold transition-colors ${
            copied
              ? "bg-emerald-100 text-emerald-700"
              : "bg-[#0066FF] text-white hover:bg-[#0055DD]"
          }`}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Kopiert
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Kopieren
            </>
          )}
        </button>
      </div>

      <div className="max-h-[260px] overflow-y-auto rounded-[10px] bg-muted/40">
        {filtered.length === 0 ? (
          <div className="px-3 py-4 text-xs text-muted-foreground text-center">
            Keine Treffer
          </div>
        ) : (
          <ul className="py-1">
            {filtered.map((email, i) => (
              <li
                key={`${email}-${i}`}
                className="px-3 py-1.5 text-xs text-foreground truncate hover:bg-muted"
                title={email}
              >
                {email}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
