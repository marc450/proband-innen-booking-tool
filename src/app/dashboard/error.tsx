"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Error boundary for every /dashboard route. Without this, any client
// component throw escapes to Next's built-in global-error screen, which
// replaces the whole document: no nav, no branding, and no error message.
// Rendering here keeps the layout (and therefore the nav) mounted and puts
// the actual message on screen, which is what makes an intermittent bug
// diagnosable at all.
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server errors reach the client with a digest and their message
    // redacted; the real stack is in the Railway logs under that digest.
    // Client errors carry the full message but never hit the server, so
    // the console is the only place they land.
    console.error("[dashboard] render error", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  const isServerError = !!error.digest;

  return (
    <div className="flex justify-center py-12">
      <Card className="w-full max-w-xl p-8">
        <div className="flex items-start gap-4">
          <AlertTriangle className="h-6 w-6 shrink-0 text-[#733D29]" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold">Diese Seite konnte nicht geladen werden</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ein unerwarteter Fehler ist aufgetreten. Du kannst es erneut versuchen. Bleibt der
              Fehler bestehen, gib den technischen Hinweis unten weiter.
            </p>

            <div className="mt-5 rounded-[10px] bg-muted p-4">
              <p className="text-xs font-medium text-muted-foreground">Technischer Hinweis</p>
              <p className="mt-1 break-words font-mono text-xs">
                {error.message || "Unbekannter Fehler"}
              </p>
              {isServerError && (
                <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                  Digest: {error.digest}
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={reset}>
                <RotateCw className="h-4 w-4" />
                Erneut versuchen
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Seite neu laden
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
