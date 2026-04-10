"use client";

import { useMemo, useState } from "react";
import { Copy, Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  emails: string[];
}

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
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suche..."
            className="h-8 text-xs pl-7"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="h-8 text-xs"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 mr-1" />
              Kopiert
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 mr-1" />
              Kopieren
            </>
          )}
        </Button>
      </div>

      <div className="max-h-[260px] overflow-y-auto rounded-md border divide-y">
        {filtered.length === 0 ? (
          <div className="px-3 py-4 text-xs text-muted-foreground text-center">
            Keine Treffer
          </div>
        ) : (
          filtered.map((email, i) => (
            <div
              key={`${email}-${i}`}
              className="px-3 py-1.5 text-xs text-foreground truncate hover:bg-muted/50"
              title={email}
            >
              {email}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
