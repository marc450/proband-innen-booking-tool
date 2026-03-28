"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Loader2, XCircle } from "lucide-react";

export function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      setErrorMessage("Keine Session-ID gefunden.");
      return;
    }

    const confirmBooking = async () => {
      try {
        const res = await fetch("/api/confirm-booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Buchung konnte nicht bestätigt werden.");
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        setStatus("success");
      } catch (err) {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten");
      }
    };

    confirmBooking();
  }, [sessionId]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mx-auto mb-4" />
            <CardTitle>Buchung wird bestätigt...</CardTitle>
            <CardDescription className="text-base mt-2">
              Bitte warte einen Moment.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <CardTitle className="text-red-600 text-2xl">Fehler bei der Buchung</CardTitle>
            <CardDescription className="text-base mt-2">
              {errorMessage || "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full shadow-sm">
        <CardHeader className="text-center px-8 py-10">
          <CheckCircle className="h-16 w-16 text-primary mx-auto mb-6" />
          <CardTitle className="text-primary text-3xl font-bold">Buchung bestätigt!</CardTitle>
          <CardDescription className="text-base mt-4 leading-relaxed">
            Vielen Dank für Deine Buchung. Du erhältst in Kürze eine Bestätigung per E-Mail.
          </CardDescription>
          <div className="mt-6 bg-muted/50 border rounded-lg px-5 py-4 text-sm text-muted-foreground leading-relaxed text-left">
            <p className="font-semibold text-foreground mb-1">Bitte beachte:</p>
            <p>
              Bei Nichterscheinen oder Absage weniger als <strong className="text-foreground">48 Stunden</strong> vor
              dem Termin wird eine Ausfallgebühr von <strong className="text-foreground">50,00 EUR</strong> erhoben.
            </p>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
