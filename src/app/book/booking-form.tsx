"use client";

import { useState, useRef, useCallback } from "react";
import { AvailableSlot } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface BookingFormProps {
  slot: AvailableSlot;
  guidePrice?: string | null;
}

type Step = "details" | "agb" | "privacy" | "confirm";

export function BookingForm({ slot, guidePrice }: BookingFormProps) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [agreedToEmailComm, setAgreedToEmailComm] = useState(false);
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
      const checkoutRes = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: slot.id,
          email: email.trim(),
          phone,
          successUrl: `${origin}/book/success`,
          cancelUrl: `${origin}/book`,
        }),
      });
      const checkoutData = await checkoutRes.json();

      if (!checkoutRes.ok) throw new Error(checkoutData?.error || "Fehler beim Erstellen der Checkout-Session");
      if (checkoutData?.checkoutUrl) {
        window.location.href = checkoutData.checkoutUrl;
      } else {
        throw new Error("Keine Checkout-URL erhalten");
      }
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

  const isBotulinum = slot.course_title?.toLowerCase().includes("botulinum") ?? false;
  const [confirmedBotulinum, setConfirmedBotulinum] = useState(false);

  const canProceedFromDetails = email.trim() !== "" && phone.trim() !== "" && (!isBotulinum || confirmedBotulinum);
  const canProceedFromAgb = agreedToTerms;
  const canProceedFromPrivacy = agreedToPrivacy && agreedToEmailComm;

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

      {guidePrice && (
        <div className="bg-muted/50 border rounded-md px-4 py-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Die Bezahlung erfolgt nach der Behandlung vor Ort. Die Abrechnung erfolgt nach GOÄ. Der Richtpreis von <span className="font-semibold text-foreground">€{guidePrice}</span> dient als Orientierung. Der genaue Behandlungsumfang und die endgültigen Kosten werden im persönlichen Aufklärungsgespräch mit der behandelnden Ärzt:in festgelegt.
          </p>
        </div>
      )}

      <Card className="shadow-sm">
        <CardContent className="pt-6">

          {/* Step 1: Contact details */}
          {currentStep === "details" && (
            <div className="space-y-4">
              <h3 className="font-semibold text-base mb-2">Deine Kontaktdaten</h3>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="deine@email.de"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 text-base"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Damit können wir Deine Buchung zuordnen.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm font-medium">Telefon</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+49 123 456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-11 text-base"
                  required
                />
              </div>

              {isBotulinum && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md p-3">
                  <input
                    type="checkbox"
                    id="botulinumConfirm"
                    checked={confirmedBotulinum}
                    onChange={(e) => setConfirmedBotulinum(e.target.checked)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="botulinumConfirm" className="text-sm font-normal leading-snug text-amber-900">
                    Ich bestätige, dass meine letzte Behandlung mit Botulinum in der gewünschten Zone mindestens zwei Monate zurückliegt.
                  </Label>
                </div>
              )}

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

          {/* Step 2: AGB */}
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

                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 -mx-1">
                  <h4 className="font-bold text-amber-900">§5 Verbindlichkeit der Buchung, Stornierung und No-Show-Gebühr</h4>
                  <p className="mt-1 text-amber-900">Die Buchung eines Behandlungstermins ist verbindlich. Aufgrund begrenzter Kapazitäten und des hohen organisatorischen Aufwands ist eine zuverlässige Teilnahme erforderlich.</p>
                  <p className="mt-1 text-amber-900">Eine kostenfreie Stornierung ist bis spätestens 48 Stunden vor dem gebuchten Termin möglich.</p>
                  <p className="mt-2 font-bold text-amber-900">Bei einer Absage weniger als 48 Stunden vor dem Termin oder bei Nichterscheinen (No-Show) wird eine Ausfallgebühr in Höhe von 50 € erhoben.</p>
                  <p className="mt-1 text-amber-900">Mit der Buchung eines Termins und der Zustimmung zu diesen AGB erklärt sich die Proband:in ausdrücklich mit der Erhebung dieser Ausfallgebühr einverstanden.</p>
                  <p className="mt-1 text-amber-900">EPHIA behält sich darüber hinaus vor, Proband:innen bei wiederholtem unzuverlässigem Verhalten vom Proband:innenprogramm auszuschließen.</p>
                </div>

                <div>
                  <h4 className="font-semibold">§6 Terminänderung durch EPHIA</h4>
                  <p className="mt-1">Um einen lückenlosen Behandlungsablauf innerhalb der Kurse sicherzustellen, ist EPHIA berechtigt, gebuchte Zeitfenster auf einen anderen verfügbaren Termin innerhalb desselben Kurstages umzulegen oder die Buchung ersatzlos zu stornieren, sofern das gewählte Zeitfenster zu Behandlungslücken im Kursablauf führen würde.</p>
                  <p className="mt-1">EPHIA wird die Proband:in in einem solchen Fall rechtzeitig per E-Mail über die Änderung oder Stornierung informieren.</p>
                </div>

                <div>
                  <h4 className="font-semibold">§7 Vorbereitung auf die Behandlung</h4>
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
                  <h4 className="font-semibold">§8 Behandlungskosten und Abrechnung</h4>
                  <p className="mt-1">Die auf der Buchungsseite angegebenen Richtpreise dienen ausschließlich der Orientierung und stellen kein verbindliches Angebot dar.</p>
                  <p className="mt-1">Der genaue Behandlungsumfang und die endgültigen Kosten werden im persönlichen Aufklärungsgespräch mit der behandelnden Ärzt:in vor der Behandlung festgelegt. Die Abrechnung erfolgt nach der Gebührenordnung für Ärzte (GOÄ).</p>
                  <p className="mt-1">Die Bezahlung der Behandlung erfolgt nach der Behandlung vor Ort. Eine Vorauszahlung findet nicht statt. Die im Rahmen der Buchung hinterlegte Bezahlmethode dient ausschließlich zur Absicherung der Ausfallgebühr gemäß §5 dieser Teilnahmebedingungen.</p>
                </div>

                <div>
                  <h4 className="font-semibold">§9 Gesundheitlicher Zustand und Mitwirkungspflichten</h4>
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
                  Ich habe die AGB gelesen und stimme diesen zu. Insbesondere bin ich mit der Erhebung einer Ausfallgebühr von 50 € bei Nichterscheinen oder verspäteter Absage einverstanden.
                </Label>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setCurrentStep("details")}>
                  Zurück
                </Button>
                <Button className="flex-1" disabled={!canProceedFromAgb} onClick={() => setCurrentStep("privacy")}>
                  Weiter
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Privacy */}
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
                      <li>Unter personenbezogenen Daten versteht man sämtliche Informationen, die sich auf eine bestimmte oder bestimmbare natürliche Person beziehen. Dies umfasst in erster Linie Daten wie Deinen Namen, Deine E-Mail-Adresse, Wohnadresse und Telefonnummer.</li>
                      <li>Zudem fallen Informationen über die Nutzung unserer Webseite unter die Kategorie personenbezogener Daten. Wir sammeln und verarbeiten solche Daten ausschließlich, wenn Du uns diese aktiv zur Verfügung stellst.</li>
                      <li>Deine personenbezogenen Daten bewahren wir nur so lange auf, wie es zur Erreichung der genannten Zwecke notwendig ist.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold">2. Zweck und Rechtsgrundlagen der Datenverwendung</h4>
                    <p className="mt-1 font-medium">2.1 Zwecke der Datenverwendung</p>
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      <li>Zur Bereitstellung der Dienste, die Du von uns anforderst.</li>
                      <li>Um sicherzustellen, dass unsere Webseite Dir gegenüber auf möglichst effiziente und ansprechende Weise dargestellt wird.</li>
                      <li>Zur Erfüllung unserer vertraglichen Pflichten.</li>
                      <li>Um Dir die Möglichkeit zu geben, an unseren interaktiven Angeboten teilzunehmen.</li>
                      <li>Um Dich über Veränderungen unserer Dienstleistungen zu informieren.</li>
                    </ul>
                    <p className="mt-2 font-medium">2.2 Rechtsgrundlagen</p>
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      <li>Deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO)</li>
                      <li>Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO)</li>
                      <li>Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO)</li>
                      <li>Rechtliche Verpflichtungen (Art. 6 Abs. 1 lit. c DSGVO)</li>
                    </ul>
                    <p className="mt-1">Falls die Verarbeitung Deiner Daten auf Deine Einwilligung basiert, hast Du das Recht, diese Einwilligung jederzeit zu widerrufen.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold">3. Informationen über Deinen Computer, Cookies und Tracking</h4>
                    <p className="mt-1">Bei jedem Besuch unserer Webseite sammeln wir bestimmte Informationen über Deinen Computer, einschließlich Deiner IP-Adresse, der Anfrage Deines Browsers sowie des Zeitpunkts dieser Anfrage. Deine IP-Adresse wird nur während Deiner Nutzung der Webseite gespeichert und danach sofort gelöscht oder durch Kürzung anonymisiert.</p>
                    <p className="mt-1">Es kann sein, dass wir Informationen über Deine Nutzung unserer Webseite auch mittels Browser-Cookies erfassen. Du kannst die Speicherung der Cookies verhindern, indem Du eine entsprechende Einstellung Deiner Browser-Software vornimmst.</p>
                    <p className="mt-1">Unsere Webseite kann Meta Pixel (Facebook-/Instagram-Tracking) verwenden. Das Meta Pixel wird nur aktiviert, wenn Du dem explizit zustimmst (Art. 6 Abs. 1 lit. a DSGVO). Du kannst Deine Einwilligung jederzeit über die Cookie-Einstellungen widerrufen.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold">4. Datensicherheit</h4>
                    <p className="mt-1">Alle Daten, die Du uns übermittelst, werden auf Servern innerhalb der Europäischen Union gespeichert. Um Deine Daten bestmöglich zu schützen, setzen wir umfangreiche technische und organisatorische Sicherheitsmaßnahmen ein, darunter die Verschlüsselungstechnologie SSL (Secure Socket Layer).</p>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-md p-3 -mx-1">
                    <h4 className="font-bold text-green-900">5. Ende-zu-Ende-Verschlüsselung medizinischer Daten</h4>
                    <p className="mt-1 text-green-900">Zum Schutz Deiner sensiblen medizinischen und personenbezogenen Daten setzen wir eine Ende-zu-Ende-Verschlüsselung (E2EE) ein. Deine persönlichen Daten (Name, E-Mail, Telefonnummer, Adresse) werden bereits in Deinem Browser verschlüsselt, bevor sie an unsere Server übertragen werden.</p>
                    <p className="mt-1 text-green-900">Die verschlüsselten Daten werden in unserer Datenbank ausschließlich als nicht lesbarer Chiffretext gespeichert. Eine Entschlüsselung ist nur durch autorisierte EPHIA-Mitarbeitende mit dem entsprechenden privaten Schlüssel möglich. Weder der Datenbankanbieter noch unbefugte Dritte können auf Deine Klartextdaten zugreifen.</p>
                    <p className="mt-1 text-green-900">Wir verwenden hierfür asymmetrische RSA-Verschlüsselung in Kombination mit AES-256-GCM, dem gleichen Verschlüsselungsstandard, der auch von Banken und Behörden eingesetzt wird.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold">6. Keine Weitergabe Deiner personenbezogenen Daten</h4>
                    <p className="mt-1">Wir übermitteln Deine personenbezogenen Daten nicht an Dritte, außer Du hast uns Deine explizite Zustimmung dazu erteilt oder wir sind durch gesetzliche Vorgaben zur Weitergabe berechtigt oder verpflichtet.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold">7. Datenschutz und Websites Dritter</h4>
                    <p className="mt-1">Unsere Website kann Hyperlinks zu Websites Dritter enthalten. Wenn Du diesen Links folgst, beachte bitte, dass wir keine Verantwortung für externe Inhalte oder Datenschutzpraktiken übernehmen können.</p>
                    <p className="mt-1">Diese Webseite nutzt Google Analytics mit aktivierter IP-Anonymisierung. Du kannst die Erfassung durch Google Analytics verhindern, indem Du das unter https://tools.google.com/dlpage/gaoptout?hl=de verfügbare Browser-Plugin installierst.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold">8. Änderungen dieser Datenschutzerklärung</h4>
                    <p className="mt-1">Wir behalten uns das Recht vor, diese Datenschutzerklärung jederzeit für die Zukunft zu ändern. Die aktuellste Version ist stets auf unserer Webseite abrufbar.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold">9. Deine Rechte und Kontaktmöglichkeiten</h4>
                    <p className="mt-1">In Bezug auf die Verarbeitung Deiner personenbezogenen Daten stehen Dir umfassende Rechte zur Verfügung: Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Widerspruch sowie Datenübertragbarkeit.</p>
                    <p className="mt-1">Um eines Deiner Rechte in Anspruch zu nehmen oder weitere Informationen zu erhalten, kontaktiere uns bitte unter customerlove@ephia.de.</p>
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

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="emailComm"
                  checked={agreedToEmailComm}
                  onChange={(e) => setAgreedToEmailComm(e.target.checked)}
                  className="mt-1"
                />
                <Label htmlFor="emailComm" className="text-sm font-normal leading-snug">
                  Ich bin einverstanden, dass Buchungsbestätigungen und Terminänderungen per unverschlüsselter E-Mail an mich übermittelt werden.
                </Label>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setCurrentStep("agb")}>
                  Zurück
                </Button>
                <Button className="flex-1" disabled={!canProceedFromPrivacy} onClick={() => setCurrentStep("confirm")}>
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
                <div className="flex items-center gap-2 py-2 border-b">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="text-sm">AGB akzeptiert</span>
                </div>
                <div className="flex items-center gap-2 py-2 border-b">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="text-sm">Datenschutzerklärung akzeptiert</span>
                </div>
                <div className="flex items-center gap-2 py-2 border-b">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="text-sm">E-Mail-Kommunikation zugestimmt</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Im nächsten Schritt wirst Du gebeten, eine Bezahlmethode zu hinterlegen. Diese dient ausschließlich zur Absicherung im Falle eines No-Shows (50,00 EUR bei Nichterscheinen oder Absage weniger als 48 Stunden vor dem Termin). Es wird jetzt keine Zahlung vorgenommen. Die Bezahlung der Behandlung erfolgt vor Ort.
              </p>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row gap-3">
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
                      Weiterleitung...
                    </span>
                  ) : (
                    "Bezahlmethode hinterlegen"
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
