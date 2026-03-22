"use client";

import { useState } from "react";
import {
  useStripe,
  useElements,
  CardElement,
} from "@stripe/react-stripe-js";
import { createClient } from "@/lib/supabase/client";
import { AvailableSlot } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BookingFormProps {
  slot: AvailableSlot;
  onComplete: () => void;
}

export function BookingForm({ slot, onComplete }: BookingFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Create SetupIntent via Edge Function
      const { data: setupData, error: setupError } = await supabase.functions.invoke(
        "create-setup-intent",
        { body: { name, email } }
      );

      if (setupError || !setupData?.clientSecret) {
        throw new Error(setupError?.message || "Failed to create setup intent");
      }

      // 2. Confirm card setup
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(
        setupData.clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: { name, email },
          },
        }
      );

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (!setupIntent || setupIntent.status !== "succeeded") {
        throw new Error("Card setup failed");
      }

      // 3. Confirm booking via Edge Function
      const { data: bookingData, error: bookingError } = await supabase.functions.invoke(
        "confirm-booking",
        {
          body: {
            slotId: slot.id,
            name,
            email,
            setupIntentId: setupIntent.id,
          },
        }
      );

      if (bookingError) {
        throw new Error(bookingError.message || "Failed to confirm booking");
      }

      if (bookingData?.error) {
        throw new Error(bookingData.error);
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Buchungsformular</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Vor- und Nachname"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ihre@email.de"
                required
              />
            </div>

            <div>
              <Label>Zahlungsmethode</Label>
              <div className="mt-1 p-3 border rounded-md bg-white">
                <CardElement
                  options={{
                    style: {
                      base: {
                        fontSize: "16px",
                        color: "#1a1a1a",
                        "::placeholder": { color: "#a0a0a0" },
                      },
                    },
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Ihre Karte wird jetzt nicht belastet. Die Zahlungsdaten werden nur
                hinterlegt, um im Falle eines No-Shows eine Gebühr von 50 EUR erheben zu
                können.
              </p>
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
              Ich stimme zu, dass eine Gebühr von 50 EUR erhoben wird, wenn ich nicht
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
            disabled={!stripe || !agreedToTerms || loading}
          >
            {loading ? "Wird gebucht..." : "Jetzt buchen"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
