import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function PrivatSuccessPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="max-w-lg mx-auto px-4 py-5">
          <h1 className="text-lg font-semibold tracking-tight">EPHIA Privatpatient:innen-Buchung</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-12">
        <Card className="shadow-sm">
          <CardContent className="py-10 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Buchung erfolgreich!</h2>
            <p className="text-muted-foreground mb-6">
              Dein Termin wurde erfolgreich gebucht. Du erhältst in Kürze eine Bestätigung per E-Mail.
            </p>
            <Link
              href="/book/privat"
              className="text-sm text-primary hover:underline"
            >
              Weitere Buchung vornehmen
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
