"use client";

import { useState, useRef, useCallback } from "react";
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
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const agbRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = agbRef.current;
    if (!el) return;
    // Check if user has scrolled to within 20px of the bottom
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
    if (atBottom) {
      setHasScrolledToBottom(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Check blacklist status before sending to Stripe
      const eligibilityRes = await fetch("/api/check-booking-eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), phone: phone.trim(), courseId: slot.course_id }),
      });
      const eligibility = await eligibilityRes.json();

      if (!eligibility.eligible) {
        setError(
          eligibility.reason === "already_booked"
            ? "Du hast für diesen Kurs bereits einen Termin gebucht."
            : "Eine Buchung ist mit diesen Daten leider nicht möglich. Bitte wende Dich direkt an uns."
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
            email: email.trim(),
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

          {/* AGB Section */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Allgemeine Teilnahmebedingungen (AGB)</Label>
            <p className="text-xs text-muted-foreground">
              Bitte lies die AGB vollständig durch, um fortzufahren.
            </p>
            <div
              ref={agbRef}
              onScroll={handleScroll}
              className="h-64 overflow-y-auto border rounded-md p-4 text-xs leading-relaxed bg-muted/30 space-y-4"
            >
              <h3 className="font-bold text-sm">Allgemeine Teilnahmebedingungen für Proband:innen (EPHIA)</h3>

              <div>
                <h4 className="font-semibold">§1 Kein Anspruch auf Behandlung</h4>
                <p className="mt-1">
                  Die Registrierung bzw. Buchung eines Termins als Proband:in begründet keinen rechtlichen Anspruch auf Durchführung einer Behandlung.
                  Die Auswahl der Proband:innen sowie die Entscheidung über Art und Umfang der Behandlung erfolgt ausschließlich durch die behandelnde Ärztin oder den behandelnden Arzt auf Grundlage medizinischer und organisatorischer Kriterien.
                </p>
                <p className="mt-1">
                  Die behandelnde Ärzt:in ist jederzeit berechtigt, eine Behandlung auch kurzfristig und ohne Angabe von Gründen abzulehnen, insbesondere wenn medizinische oder organisatorische Gründe entgegenstehen.
                </p>
              </div>

              <div>
                <h4 className="font-semibold">§2 Behandelnde Personen, Verantwortung &amp; Vertragsverhältnis</h4>
                <p className="mt-1">
                  Die medizinische Behandlung erfolgt ausschließlich durch selbstständig tätige, approbierte Ärztinnen und Ärzte oder Zahnärztinnen und Zahnärzte. Diese handeln eigenverantwortlich und unterliegen im Rahmen der Kurse der fachlichen Anleitung und Aufsicht durch qualifizierte Dozent:innen.
                </p>
                <p className="mt-1">
                  Das Behandlungsverhältnis sowie die Abrechnung bestehen ausschließlich zwischen der behandelnden Ärzt:in und der Proband:in. Die behandelnde Ärzt:in ist stets diejenige Person, die die konkrete Behandlung durchführt.
                </p>
                <p className="mt-1">
                  Die EPHIA Medical GmbH tritt nicht als Behandlerin auf. Sie ist nicht Partei des Behandlungsvertrags und übernimmt keine medizinische Verantwortung oder Haftung für die Durchführung oder das Ergebnis der Behandlung.
                </p>
                <p className="mt-1">
                  EPHIA handelt ausschließlich im Auftrag der dozierenden bzw. behandelnden Ärzt:innen und übernimmt organisatorische Aufgaben, insbesondere im Zusammenhang mit Terminvergabe, Kursorganisation und Teilnehmermanagement.
                </p>
              </div>

              <div>
                <h4 className="font-semibold">§3 Aufklärung und Einwilligung</h4>
                <p className="mt-1">
                  Vor jeder Behandlung erfolgt eine umfassende medizinische Aufklärung durch die behandelnde Ärzt:in.
                </p>
                <p className="mt-1">
                  Die Durchführung der Behandlung setzt die vorherige schriftliche Einwilligung der Proband:in voraus. Proband:innen haben jederzeit das Recht, Fragen zu stellen sowie eine Behandlung oder Teilnahme ohne Angabe von Gründen abzulehnen.
                </p>
              </div>

              <div>
                <h4 className="font-semibold">§4 Behandlungsergebnis, Korrekturen und Reklamationen</h4>
                <p className="mt-1">
                  Die Behandlungen erfolgen im Rahmen von ärztlichen Fortbildungen zu Ausbildungszwecken. Trotz sorgfältiger Durchführung kann kein bestimmtes ästhetisches Ergebnis garantiert werden.
                </p>
                <p className="mt-1">
                  Abweichungen im Behandlungsergebnis sind möglich und stellen keinen Mangel dar. Ein Anspruch auf ein bestimmtes Ergebnis besteht nicht.
                </p>
                <p className="mt-1">
                  Im Falle von Unzufriedenheit unterstützt EPHIA auf Wunsch die Kommunikation mit der behandelnden Ärzt:in. Die Entscheidung über medizinisch indizierte Korrekturen liegt ausschließlich bei der behandelnden Ärzt:in.
                </p>
                <p className="mt-1">
                  Etwaige Korrekturbehandlungen außerhalb des Kurses werden direkt zwischen der Proband:in und der behandelnden Ärzt:in abgerechnet. Ein genereller Anspruch auf kostenfreie Nachbehandlungen besteht nicht.
                </p>
              </div>

              {/* §5 highlighted */}
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 -mx-1">
                <h4 className="font-bold text-amber-900">§5 Verbindlichkeit der Buchung, Stornierung und No-Show-Gebühr</h4>
                <p className="mt-1 text-amber-900">
                  Die Buchung eines Behandlungstermins ist verbindlich. Aufgrund begrenzter Kapazitäten und des hohen organisatorischen Aufwands ist eine zuverlässige Teilnahme erforderlich.
                </p>
                <p className="mt-1 text-amber-900">
                  Eine kostenfreie Stornierung ist bis spätestens 48 Stunden vor dem gebuchten Termin möglich.
                </p>
                <p className="mt-2 font-bold text-amber-900">
                  Bei einer Absage weniger als 48 Stunden vor dem Termin oder bei Nichterscheinen (No-Show) wird eine Ausfallgebühr in Höhe von 50 € erhoben.
                </p>
                <p className="mt-1 text-amber-900">
                  Mit der Buchung eines Termins und der Zustimmung zu diesen AGB erklärt sich die Proband:in ausdrücklich mit der Erhebung dieser Ausfallgebühr einverstanden.
                </p>
                <p className="mt-1 text-amber-900">
                  EPHIA behält sich darüber hinaus vor, Proband:innen bei wiederholtem unzuverlässigem Verhalten vom Proband:innenprogramm auszuschließen.
                </p>
              </div>

              <div>
                <h4 className="font-semibold">§6 Vorbereitung auf die Behandlung</h4>
                <p className="mt-1">
                  Zur Gewährleistung eines sicheren und reibungslosen Ablaufs verpflichten sich Proband:innen, folgende Vorbereitungshinweise einzuhalten:
                </p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Kein Konsum von Alkohol oder Drogen innerhalb von 24 Stunden vor dem Termin</li>
                  <li>Keine Einnahme blutverdünnender Medikamente (z. B. ASS), sofern medizinisch vertretbar</li>
                  <li>Ungeschminktes Erscheinen bei Gesichtsbehandlungen</li>
                  <li>Frisch gereinigte Haut ohne unmittelbar zuvor aufgetragene Pflegeprodukte</li>
                  <li>Pünktliches Erscheinen (empfohlen: mindestens 10 Minuten vor Terminbeginn)</li>
                </ul>
                <p className="mt-1">
                  Bei Nichteinhaltung kann die Behandlung aus medizinischen oder organisatorischen Gründen abgelehnt werden.
                </p>
              </div>

              <div>
                <h4 className="font-semibold">§7 Gesundheitlicher Zustand und Mitwirkungspflichten</h4>
                <p className="mt-1">
                  Proband:innen sind verpflichtet, die behandelnde Ärzt:in vor der Behandlung vollständig und wahrheitsgemäß über ihren Gesundheitszustand zu informieren.
                </p>
                <p className="mt-1">Dies umfasst insbesondere:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>relevante Vorerkrankungen</li>
                  <li>Allergien oder Unverträglichkeiten</li>
                  <li>aktuelle Medikation (insbesondere Antibiotika, Blutverdünner, Immunsuppressiva)</li>
                  <li>Schwangerschaft oder Stillzeit</li>
                </ul>
                <p className="mt-1">
                  Unvollständige oder fehlerhafte Angaben können zu Risiken führen und berechtigen die behandelnde Ärzt:in, die Behandlung abzulehnen.
                </p>
              </div>
            </div>

            {!hasScrolledToBottom && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <span>↓</span> Bitte scrolle bis zum Ende der AGB, um fortzufahren.
              </p>
            )}

            <div className="flex items-start gap-2 pt-1">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                disabled={!hasScrolledToBottom}
                className="mt-1 disabled:opacity-40"
                required
              />
              <Label htmlFor="terms" className={`text-sm font-normal leading-snug ${!hasScrolledToBottom ? "opacity-40" : ""}`}>
                Ich habe die Allgemeinen Teilnahmebedingungen gelesen und stimme diesen zu. Insbesondere bin ich mit der Erhebung einer Ausfallgebühr von 50 € bei Nichterscheinen oder verspäteter Absage einverstanden.
              </Label>
            </div>
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
