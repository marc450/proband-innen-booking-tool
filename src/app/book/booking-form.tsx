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

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const origin = window.location.origin;

      const { data, error: fnError } = await supabase.functions.invoke(
        "create-checkout-session",
        {
          body: {
            firstName,
            lastName,
            email,
            phone,
            addressStreet,
            addressZip,
            addressCity,
            slotId: slot.id,
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
    <Card>
      <CardHeader>
        <CardTitle>Deine Daten</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Vorname</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Max"
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Nachname</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Mustermann"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="deine@email.de"
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+49 123 456789"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Privatadresse</Label>
              <Input
                value={addressStreet}
                onChange={(e) => setAddressStreet(e.target.value)}
                placeholder="Strasse und Hausnummer"
                required
              />
              <div className="grid grid-cols-3 gap-4">
                <Input
                  value={addressZip}
                  onChange={(e) => setAddressZip(e.target.value)}
                  placeholder="PLZ"
                  required
                />
                <div className="col-span-2">
                  <Input
                    value={addressCity}
                    onChange={(e) => setAddressCity(e.target.value)}
                    placeholder="Ort"
                    required
                  />
                </div>
              </div>
            </div>
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
            disabled={!agreedToTerms || loading}
          >
            {loading ? "Weiter zur Zahlung..." : "Weiter zur Zahlungsmethode"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Du wirst zu Stripe weitergeleitet, um Deine Zahlungsdaten zu hinterlegen.
            Es wird jetzt keine Zahlung vorgenommen.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
