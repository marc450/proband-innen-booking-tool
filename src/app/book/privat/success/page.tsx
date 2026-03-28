import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export default function PrivatSuccessPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/20 bg-white">
        <div className="max-w-lg mx-auto px-4 py-4">
          <a href="https://ephia.de" target="_blank" rel="noopener noreferrer">
            <img src="/logo.svg" alt="EPHIA" className="h-7" />
          </a>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-12">
        <Card className="shadow-sm">
          <CardContent className="py-10 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Buchung erfolgreich!</h2>
            <p className="text-muted-foreground">
              Dein Termin wurde erfolgreich gebucht. Du erhältst in Kürze eine Bestätigung per E-Mail.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
