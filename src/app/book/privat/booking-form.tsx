"use client";

import { useState, useRef, useCallback } from "react";
import { AvailableSlot } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface Props {
  slot: AvailableSlot;
}

type Step = "details" | "agb" | "privacy" | "confirm";

export function PrivatBookingForm({ slot }: Props) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [referringDoctor, setReferringDoctor] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [hasScrolledAgb, setHasScrolledAgb] = useState(false);
  const [privacyExpanded, setPrivacyExpanded] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>("details");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const agbRef = useRef<HTMLDivElement>(null);

  const handleAgbScroll = useCallback(() => {
    const el = agbRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
      setHasScrolledAgb(true);
    }
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/create-private-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: slot.id,
          email: email.trim(),
          phone: phone.trim(),
          referringDoctor: referringDoctor.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Ein Fehler ist aufgetreten");
        setLoading(false);
        return;
      }

      router.push("/book/privat/success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten");
      setLoading(false);
    }
  };

  const steps: { key: Step; label: string }[] = [
    { key: "details", label: "Kontaktdaten" },
    { key: "agb", label: "AGB" },
    { key: "privacy", label: "Datenschutz" },
    { key: "confirm", label: "Bestätigung" },
  ];

  const stepIndex = steps.findIndex((s) => s.key === currentStep);

  const canProceedFromDetails = email.trim() !== "" && phone.trim() !== "" && referringDoctor.trim() !== "";

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-1 px-1">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1 flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-full h-1.5 rounded-full transition-colors ${
                  i <= stepIndex ? "bg-primary" : "bg-muted"
                }`}
              />
              <span className={`text-[10px] mt-1 ${i === stepIndex ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {s.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardContent className="pt-6">

          {/* Step 1: Contact details */}
          {currentStep === "details" && (
            <div className="space-y-5">
              <h3 className="font-semibold text-base">Deine Kontaktdaten</h3>

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

              <div>
                <Label htmlFor="referringDoctor">Name der zuweisenden Ärzt:in</Label>
                <Input
                  id="referringDoctor"
                  type="text"
                  placeholder="z.B. Dr. med. Anna Müller"
                  value={referringDoctor}
                  onChange={(e) => setReferringDoctor(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Die Ärzt:in, die Dich zu diesem Kurs mitbringt.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {error}
                </div>
              )}

              <Button
                className="w-full"
                disabled={!canProceedFromDetails}
                onClick={() => { setError(null); setCurrentStep("agb"); }}
              >
                Weiter
              </Button>
            </div>
          )}

          {/* Step 2: AGB (modified for private patients) */}
          {currentStep === "agb" && (
            <div className="space-y-4">
              <h3 className="font-semibold text-base">Allgemeine Teilnahmebedingungen</h3>
              <p className="text-xs text-muted-foreground">
                Bitte lies die AGB vollständig durch, um fortzufahren.
              </p>

              <div
                ref={agbRef}
                onScroll={handleAgbScroll}
                className="h-72 overflow-y-auto border rounded-md p-4 text-xs leading-relaxed bg-muted/30 space-y-4"
              >
                <h4 className="font-bold text-sm">Allgemeine Teilnahmebedingungen für Proband:innen (EPHIA)</h4>

                <div>
                  <h4 className="font-semibold">§1 Kein Anspruch auf Behandlung</h4>
                  <p className="mt-1">Die Registrierung bzw. Buchung eines Termins als Proband:in begründet keinen rechtlichen Anspruch auf Durchführung einer Behandlung. Die Auswahl der Proband:innen sowie die Entscheidung über Art und Umfang der Behandlung erfolgt ausschließlich durch die behandelnde Ärztin oder den behandelnden Arzt auf Grundlage medizinischer und organisatorischer Kriterien.</p>
                  <p className="mt-1">Die behandelnde Ärzt:in ist jederzeit berechtigt, eine Behandlung auch kurzfristig und ohne Angabe von Gründen abzulehnen, insbesondere wenn medizinische oder organisatorische Gründe entgegenstehen.</p>
                </div>

                <div>
                  <h4 className="font-semibold">§2 Behandelnde Personen, Verantwortung &amp; Vertragsverhältnis</h4>
                  <p className="mt-1">Die medizinische Behandlung erfolgt ausschließlich durch selbstständig tätige, approbierte Ärztinnen und Ärzte oder Zahnärztinnen und Zahnärzte. Diese handeln eigenverantwortlich und unterliegen im Rahmen der Kurse der fachlichen Anleitung und Aufsicht durch qualifizierte Dozent:innen.</p>
                  <p className="mt-1">Das Behandlungsverhältnis sowie die Abrechnung bestehen ausschließlich zwischen der behandelnden Ärzt:in und der Proband:in. Die behandelnde Ärzt:in ist stets diejenige Person, die die konkrete Behandlung durchführt.</p>
                  <p className="mt-1">Die EPHIA Medical GmbH tritt nicht als Behandlerin auf. Sie ist nicht Partei des Behandlungsvertrags und übernimmt keine medizinische Verantwortung oder Haftung für die Durchführung oder das Ergebnis der Behandlung.</p>
                  <p className="mt-1">EPHIA handelt ausschließlich im Auftrag der dozierenden bzw. behandelnden Ärzt:innen und übernimmt organisatorische Aufgaben, insbesondere im Zusammenhang mit Terminvergabe, Kursorganisation und Teilnehmermanagement.</p>
                </div>

                <div>
                  <h4 className="font-semibold">§3 Aufklärung und Einwilligung</h4>
                  <p className="mt-1">Vor jeder Behandlung erfolgt eine umfassende medizinische Aufklärung durch die behandelnde Ärzt:in.</p>
                  <p className="mt-1">Die Durchführung der Behandlung setzt die vorherige schriftliche Einwilligung der Proband:in voraus. Proband:innen haben jederzeit das Recht, Fragen zu stellen sowie eine Behandlung oder Teilnahme ohne Angabe von Gründen abzulehnen.</p>
                </div>

                <div>
                  <h4 className="font-semibold">§4 Behandlungsergebnis, Korrekturen und Reklamationen</h4>
                  <p className="mt-1">Die Behandlungen erfolgen im Rahmen von ärztlichen Fortbildungen zu Ausbildungszwecken. Trotz sorgfältiger Durchführung kann kein bestimmtes ästhetisches Ergebnis garantiert werden.</p>
                  <p className="mt-1">Abweichungen im Behandlungsergebnis sind möglich und stellen keinen Mangel dar. Ein Anspruch auf ein bestimmtes Ergebnis besteht nicht.</p>
                  <p className="mt-1">Im Falle von Unzufriedenheit unterstützt EPHIA auf Wunsch die Kommunikation mit der behandelnden Ärzt:in. Die Entscheidung über medizinisch indizierte Korrekturen liegt ausschließlich bei der behandelnden Ärzt:in.</p>
                  <p className="mt-1">Etwaige Korrekturbehandlungen außerhalb des Kurses werden direkt zwischen der Proband:in und der behandelnden Ärzt:in abgerechnet. Ein genereller Anspruch auf kostenfreie Nachbehandlungen besteht nicht.</p>
                </div>

                {/* §5 NOT highlighted for private patients */}
                <div>
                  <h4 className="font-semibold">§5 Verbindlichkeit der Buchung und Stornierung</h4>
                  <p className="mt-1">Die Buchung eines Behandlungstermins ist verbindlich. Als Privatpatient:in auf Zuweisung einer teilnehmenden Ärzt:in wird keine Ausfallgebühr erhoben. Die zuverlässige Teilnahme wird durch die zuweisende Ärzt:in sichergestellt.</p>
                  <p className="mt-1">Wir bitten dennoch um rechtzeitige Absage, falls der Termin nicht wahrgenommen werden kann.</p>
                </div>

                <div>
                  <h4 className="font-semibold">§6 Vorbereitung auf die Behandlung</h4>
                  <p className="mt-1">Zur Gewährleistung eines sicheren und reibungslosen Ablaufs verpflichten sich Proband:innen, folgende Vorbereitungshinweise einzuhalten:</p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li>Kein Konsum von Alkohol oder Drogen innerhalb von 24 Stunden vor dem Termin</li>
                    <li>Keine Einnahme blutverdünnender Medikamente (z. B. ASS), sofern medizinisch vertretbar</li>
                    <li>Ungeschminktes Erscheinen bei Gesichtsbehandlungen</li>
                    <li>Frisch gereinigte Haut ohne unmittelbar zuvor aufgetragene Pflegeprodukte</li>
                    <li>Pünktliches Erscheinen (empfohlen: mindestens 10 Minuten vor Terminbeginn)</li>
                  </ul>
                  <p className="mt-1">Bei Nichteinhaltung kann die Behandlung aus medizinischen oder organisatorischen Gründen abgelehnt werden.</p>
                </div>

                <div>
                  <h4 className="font-semibold">§7 Behandlungskosten und Abrechnung</h4>
                  <p className="mt-1">Die Behandlungskosten werden direkt zwischen der Proband:in und der behandelnden Ärzt:in vereinbart. Die Abrechnung erfolgt nach der Gebührenordnung für Ärzte (GOÄ).</p>
                  <p className="mt-1">Die im Rahmen des Kurses angegebenen Richtpreise gelten nicht für Privatpatient:innen. Die Bezahlung der Behandlung erfolgt nach der Behandlung vor Ort.</p>
                </div>

                <div>
                  <h4 className="font-semibold">§8 Gesundheitlicher Zustand und Mitwirkungspflichten</h4>
                  <p className="mt-1">Proband:innen sind verpflichtet, die behandelnde Ärzt:in vor der Behandlung vollständig und wahrheitsgemäß über ihren Gesundheitszustand zu informieren.</p>
                  <p className="mt-1">Dies umfasst insbesondere:</p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li>relevante Vorerkrankungen</li>
                    <li>Allergien oder Unverträglichkeiten</li>
                    <li>aktuelle Medikation (insbesondere Antibiotika, Blutverdünner, Immunsuppressiva)</li>
                    <li>Schwangerschaft oder Stillzeit</li>
                  </ul>
                  <p className="mt-1">Unvollständige oder fehlerhafte Angaben können zu Risiken führen und berechtigen die behandelnde Ärzt:in, die Behandlung abzulehnen.</p>
                </div>
              </div>

              {!hasScrolledAgb && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <span>↓</span> Bitte scrolle bis zum Ende der AGB.
                </p>
              )}

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  disabled={!hasScrolledAgb}
                  className="mt-1 disabled:opacity-40"
                />
                <Label htmlFor="terms" className={`text-sm font-normal leading-snug ${!hasScrolledAgb ? "opacity-40" : ""}`}>
                  Ich habe die Allgemeinen Teilnahmebedingungen gelesen und stimme diesen zu.
                </Label>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setCurrentStep("details")}>
                  Zurück
                </Button>
                <Button className="flex-1" disabled={!agreedToTerms} onClick={() => setCurrentStep("privacy")}>
                  Weiter
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Privacy (identical to standard) */}
          {currentStep === "privacy" && (
            <div className="space-y-4">
              <h3 className="font-semibold text-base">Datenschutzerklärung</h3>

              <button
                type="button"
                onClick={() => setPrivacyExpanded(!privacyExpanded)}
                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                {privacyExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Datenschutzerklärung {privacyExpanded ? "ausblenden" : "lesen"}
              </button>

              {privacyExpanded && (
                <div className="h-72 overflow-y-auto border rounded-md p-4 text-xs leading-relaxed bg-muted/30 space-y-4">
                  <h4 className="font-bold text-sm">Datenschutzerklärung (EPHIA)</h4>
                  <p>Diese Datenschutzerklärung erläutert, wie wir, die Betreiber der Webseite https://ephia.de Deine persönlichen Daten als Nutzer der Webseite gemäß der Datenschutz-Grundverordnung (DSGVO) verwalten.</p>
                  <p>Deine Privatsphäre und der Schutz Deiner privaten Daten liegen uns am Herzen. Wir sammeln, verarbeiten und nutzen Deine personenbezogenen Informationen in Übereinstimmung mit den Bestimmungen dieser Datenschutzerklärung sowie den relevanten Datenschutzgesetzen, insbesondere dem Datenschutzgesetz (DSG) und der DSGVO.</p>

                  <div>
                    <h4 className="font-semibold">1. Das Sammeln von personenbezogenen Daten</h4>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Unter personenbezogenen Daten versteht man sämtliche Informationen, die sich auf eine bestimmte oder bestimmbare natürliche Person beziehen.</li>
                      <li>Wir sammeln und verarbeiten solche Daten ausschließlich, wenn Du uns diese aktiv zur Verfügung stellst.</li>
                      <li>Deine personenbezogenen Daten bewahren wir nur so lange auf, wie es zur Erreichung der genannten Zwecke notwendig ist.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold">2. Zweck und Rechtsgrundlagen der Datenverwendung</h4>
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      <li>Deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO)</li>
                      <li>Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO)</li>
                      <li>Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO)</li>
                      <li>Rechtliche Verpflichtungen (Art. 6 Abs. 1 lit. c DSGVO)</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold">3. Cookies und Tracking</h4>
                    <p className="mt-1">Deine IP-Adresse wird nur während Deiner Nutzung der Webseite gespeichert und danach sofort gelöscht oder anonymisiert.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold">4. Datensicherheit</h4>
                    <p className="mt-1">Alle Daten werden auf Servern innerhalb der EU gespeichert. Wir setzen SSL-Verschlüsselung ein.</p>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-md p-3 -mx-1">
                    <h4 className="font-bold text-green-900">5. Ende-zu-Ende-Verschlüsselung medizinischer Daten</h4>
                    <p className="mt-1 text-green-900">Zum Schutz Deiner sensiblen Daten setzen wir Ende-zu-Ende-Verschlüsselung (E2EE) ein. Deine persönlichen Daten werden bereits in Deinem Browser verschlüsselt, bevor sie an unsere Server übertragen werden.</p>
                    <p className="mt-1 text-green-900">Die verschlüsselten Daten werden ausschließlich als nicht lesbarer Chiffretext gespeichert. Wir verwenden asymmetrische RSA-Verschlüsselung in Kombination mit AES-256-GCM.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold">6. Keine Weitergabe Deiner Daten</h4>
                    <p className="mt-1">Wir übermitteln Deine Daten nicht an Dritte, außer mit Deiner Zustimmung oder aufgrund gesetzlicher Vorgaben.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold">7. Deine Rechte</h4>
                    <p className="mt-1">Du hast Recht auf Auskunft, Berichtigung, Löschung und Widerspruch. Kontakt: customerlove@ephia.de</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="privacy"
                  checked={agreedToPrivacy}
                  onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                  className="mt-1"
                />
                <Label htmlFor="privacy" className="text-sm font-normal leading-snug">
                  Ich habe die Datenschutzerklärung gelesen und verstanden. Ich stimme der Verarbeitung meiner personenbezogenen Daten gemäß den beschriebenen Zwecken zu.
                </Label>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setCurrentStep("agb")}>
                  Zurück
                </Button>
                <Button className="flex-1" disabled={!agreedToPrivacy} onClick={() => setCurrentStep("confirm")}>
                  Weiter
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {currentStep === "confirm" && (
            <div className="space-y-5">
              <h3 className="font-semibold text-base">Zusammenfassung</h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Termin</span>
                  <span className="font-medium">
                    {format(new Date(slot.start_time), "dd. MMMM yyyy", { locale: de })}, {format(new Date(slot.start_time), "HH:mm")} Uhr
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">E-Mail</span>
                  <span className="font-medium">{email}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Telefon</span>
                  <span className="font-medium">{phone}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Zuweisende:r Ärzt:in</span>
                  <span className="font-medium">{referringDoctor}</span>
                </div>
                <div className="flex items-center gap-2 py-2 border-b">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="text-sm">AGB akzeptiert</span>
                </div>
                <div className="flex items-center gap-2 py-2 border-b">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="text-sm">Datenschutzerklärung akzeptiert</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Dein Termin wird direkt gebucht. Als Privatpatient:in wird keine Bezahlmethode benötigt.
              </p>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setCurrentStep("privacy")}>
                  Zurück
                </Button>
                <Button
                  className="flex-1"
                  disabled={loading}
                  onClick={handleSubmit}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Buchung wird erstellt...
                    </span>
                  ) : (
                    "Termin buchen"
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
