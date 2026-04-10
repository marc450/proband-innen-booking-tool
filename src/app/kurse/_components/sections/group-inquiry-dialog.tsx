"use client";

import { useEffect, useState } from "react";
import { X, CheckCircle2, Loader2 } from "lucide-react";

interface GroupInquiryDialogProps {
  open: boolean;
  onClose: () => void;
  ctaLabel: string;
  courseTitle?: string;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  attendees: string;
  topic: string;
  timeframe: string;
  message: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  attendees: "",
  topic: "",
  timeframe: "",
  message: "",
};

export function GroupInquiryDialog({
  open,
  onClose,
  ctaLabel,
  courseTitle,
}: GroupInquiryDialogProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Close on ESC + lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      // Small delay so users don't see the reset mid-animation
      const t = setTimeout(() => {
        setForm(EMPTY_FORM);
        setPrivacyAccepted(false);
        setError(null);
        setSuccess(false);
        setSubmitting(false);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  const update = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!privacyAccepted) {
      setError("Bitte bestätige, dass Du die Datenschutzerklärung gelesen hast.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/group-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          courseTitle,
          sourceUrl: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Anfrage konnte nicht gesendet werden.");
      }
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ein unerwarteter Fehler ist aufgetreten.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="group-inquiry-title"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-start md:items-center justify-center bg-black/70 backdrop-blur-sm p-4 md:p-8 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-white rounded-[10px] shadow-2xl my-auto"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="absolute top-4 right-4 flex items-center justify-center w-10 h-10 rounded-full hover:bg-black/5 text-black/60 hover:text-black transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <div className="p-8 md:p-12 text-center">
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 rounded-full bg-[#0066FF]/10 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-[#0066FF]" />
              </div>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-3 text-black">
              Vielen Dank!
            </h2>
            <p className="text-base text-black/75 leading-relaxed mb-6">
              Deine Anfrage ist bei uns eingegangen. Wir melden uns schnellstmöglich
              per E-Mail bei Dir.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="inline-block text-base font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-6 py-3 transition-colors"
            >
              Schließen
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 md:p-10">
            <h2
              id="group-inquiry-title"
              className="text-2xl md:text-3xl font-bold mb-2 text-black"
            >
              Gruppenbuchungsanfrage
            </h2>
            <p className="text-sm md:text-base text-black/70 mb-6 md:mb-8">
              Erzähl uns kurz, wonach Du suchst. Wir melden uns per E-Mail bei Dir
              zurück.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <Field
                label="Vor- und Nachname"
                required
                value={form.name}
                onChange={update("name")}
                autoComplete="name"
              />
              <Field
                label="E-Mail"
                type="email"
                required
                value={form.email}
                onChange={update("email")}
                autoComplete="email"
              />
              <Field
                label="Telefon (optional)"
                type="tel"
                value={form.phone}
                onChange={update("phone")}
                autoComplete="tel"
              />
              <Field
                label="Teilnehmer:innen"
                required
                placeholder="z. B. 6 Personen"
                value={form.attendees}
                onChange={update("attendees")}
              />
              <Field
                label="Gewünschter Kursinhalt"
                required
                placeholder="z. B. Grundkurs Botulinum"
                value={form.topic}
                onChange={update("topic")}
                className="md:col-span-2"
              />
              <Field
                label="Gewünschter Zeitraum"
                required
                placeholder="z. B. Herbst 2026, flexibel"
                value={form.timeframe}
                onChange={update("timeframe")}
                className="md:col-span-2"
              />
              <TextAreaField
                label="Nachricht (optional)"
                value={form.message}
                onChange={update("message")}
                className="md:col-span-2"
                rows={4}
                placeholder="Weitere Infos, Fragen, Standort-Wünsche ..."
              />
            </div>

            <label className="mt-6 flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                required
                className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[#0066FF] cursor-pointer"
              />
              <span className="text-sm text-black/75 leading-relaxed">
                Ich habe die{" "}
                <a
                  href="https://www.ephia.de/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0066FF] font-semibold underline underline-offset-2 hover:text-[#0055DD]"
                >
                  Datenschutzerklärung
                </a>{" "}
                gelesen und stimme zu.
                <span className="text-[#0066FF]"> *</span>
              </span>
            </label>

            {error && (
              <p className="mt-5 text-sm text-red-600 bg-red-50 rounded-[10px] px-4 py-3">
                {error}
              </p>
            )}

            <div className="mt-6 md:mt-8 flex flex-col-reverse md:flex-row md:items-center md:justify-end gap-4">
              <button
                type="submit"
                disabled={submitting || !privacyAccepted}
                className="inline-flex items-center justify-center gap-2 text-base font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-6 py-3.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{submitting ? "Wird gesendet ..." : ctaLabel}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  className?: string;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  autoComplete,
  className,
}: FieldProps) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="block text-sm font-semibold text-black mb-1.5">
        {label}
        {required && <span className="text-[#0066FF]"> *</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full h-11 px-3.5 text-sm bg-[#FAEBE1]/40 rounded-[10px] outline-none focus:bg-white focus:ring-2 focus:ring-[#0066FF] transition-colors"
      />
    </label>
  );
}

interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  required?: boolean;
  placeholder?: string;
  rows?: number;
  className?: string;
}

function TextAreaField({
  label,
  value,
  onChange,
  required,
  placeholder,
  rows = 4,
  className,
}: TextAreaFieldProps) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="block text-sm font-semibold text-black mb-1.5">
        {label}
        {required && <span className="text-[#0066FF]"> *</span>}
      </span>
      <textarea
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3.5 py-2.5 text-sm bg-[#FAEBE1]/40 rounded-[10px] outline-none focus:bg-white focus:ring-2 focus:ring-[#0066FF] transition-colors resize-y"
      />
    </label>
  );
}
