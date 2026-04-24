"use client";

import { useState } from "react";
import { EmailPreview } from "../campaigns/email-preview";

interface Props {
  html: string;
}

/**
 * Preview shell for a transactional email. Reuses the same isolated iframe
 * EmailPreview as the campaign composer so the rendering is faithful, and
 * layers the Desktop / Mobil toggle on top so operators can check mobile
 * rendering the same way they do for campaigns.
 */
export function TransactionalEmailPreview({ html }: Props) {
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop");

  return (
    <div className="bg-white rounded-[10px] shadow-sm ring-1 ring-black/5 overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Vorschau</h2>
        <div className="inline-flex rounded-md border border-input bg-background p-0.5 text-xs">
          {(["desktop", "mobile"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`px-2.5 py-1 rounded-sm font-medium transition-colors ${
                mode === m
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "desktop" ? "Desktop" : "Mobil"}
            </button>
          ))}
        </div>
      </div>
      <div>
        {mode === "mobile" ? (
          <div className="bg-gray-100 p-4 flex justify-center">
            <div className="w-[390px] max-w-full rounded-[28px] bg-black p-2 shadow-lg">
              <div className="rounded-[22px] overflow-hidden bg-white">
                <EmailPreview html={html} />
              </div>
            </div>
          </div>
        ) : (
          <EmailPreview html={html} />
        )}
      </div>
    </div>
  );
}
