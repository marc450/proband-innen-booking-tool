"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AvailableSlot } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BookingFormProps {
  slot: AvailableSlot;
}

export function BookingForm({ slot }: BookingFormProps) {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Check blacklist status before sending to Stripe
      const eligibilityRes = await fetch("/api/check-booking-eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const eligibility = await eligibilityRes.json();

      if (!eligibility.eligible) {
        setError(
          "Eine Buchung ist mit dieser E-Mail-Adresse leider nicht möglich. Bitte wende Dich direkt an uns."
        );
        setLoading(false);
        return;
      }

      const origin = window.location.origin;

      const { data, error: fnError } = await supabase.functions.invoke(
        "create-checkout-session",
        {
          body: {
            slotId: slot.id,
            phone,
            successUrl: `${origin}/book/success`,
            cancelUrl: `${origin}/book`,
          },
        }
      );

      if (fnError) {
        throw new Error(fnError.message || "Fehler beim Erstellen der Checkout-Session");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("Keine Checkout-URL erhalten");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten");
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Termin buchen</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="deine@email.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Damit können wir Deine Buchung zuordnen.
            </p>
          </div>

          <div>
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+49 123 456789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="terms"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1"
              required
            />
            <Label htmlFor="terms" className="text-sm font-normal leading-snug">
              Ich stimme zu, dass eine Gebuehr von 50 EUR erhoben wird, wenn ich nicht
              erscheine oder weniger als 24 Stunden vor dem Termin absage.
            </Label>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={!agreedToTerms || !phone.trim() || !email.trim() || loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Weiterleitung zu Stripe...
              </span>
            ) : (
              "Weiter zur Zahlungsmethode"
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Du wirst zu Stripe weitergeleitet, um Deine Daten und Zahlungsmethode zu hinterlegen.
            Es wird jetzt keine Zahlung vorgenommen.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
