"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
        const supabase = createClient();
        const { data, error } = await supabase.functions.invoke("confirm-booking", {
          body: { sessionId },
        });

        if (error) {
          throw new Error(error.message);
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
            <CardTitle>Buchung wird bestaetigt...</CardTitle>
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
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
          <CardTitle className="text-primary text-2xl">Buchung bestaetigt!</CardTitle>
          <CardDescription className="text-base mt-2">
            Vielen Dank fuer Deine Buchung. Du erhaeltst eine Bestaetigung per E-Mail.
            Bitte beachte: Bei Nichterscheinen oder Absage weniger als 24 Stunden
            vor dem Termin wird eine Gebuehr von 50 EUR erhoben.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
