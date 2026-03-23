import { Suspense } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { SuccessContent } from "./success-content";

export default function BookingSuccessPage() {
  return (
    <Suspense
      fallback={
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
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
