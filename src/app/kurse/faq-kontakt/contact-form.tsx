"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
}

const EMPTY: FormState = { firstName: "", lastName: "", email: "", message: "" };

export function ContactForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const update = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.message.trim()) {
      setError("Bitte fülle alle Felder aus.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("Bitte gib eine gültige E-Mail-Adresse ein.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/contact-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          message: form.message.trim(),
          sourceUrl: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Leider ist etwas schiefgelaufen.");
        return;
      }
      setSuccess(true);
      setForm(EMPTY);
    } catch {
      setError("Leider ist etwas schiefgelaufen.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-[#FAEBE1] rounded-[10px] p-8 md:p-10 text-center space-y-3">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100">
          <CheckCircle2 className="w-6 h-6 text-emerald-700" />
        </div>
        <h3 className="text-lg font-bold">Danke, Deine Nachricht ist bei uns!</h3>
        <p className="text-sm text-black/70">
          Wir melden uns so schnell wie möglich bei Dir zurück. Werktags in der Regel innerhalb von 24 Stunden.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-[#FAEBE1] rounded-[10px] p-6 md:p-8 space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-bold tracking-wider uppercase">Dein Vorname</label>
        <input
          type="text"
          value={form.firstName}
          onChange={update("firstName")}
          autoComplete="given-name"
          className="w-full rounded-[10px] border border-[#c1a290]/40 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold tracking-wider uppercase">Dein Nachname</label>
        <input
          type="text"
          value={form.lastName}
          onChange={update("lastName")}
          autoComplete="family-name"
          className="w-full rounded-[10px] border border-[#c1a290]/40 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold tracking-wider uppercase">E-Mail-Adresse</label>
        <input
          type="email"
          value={form.email}
          onChange={update("email")}
          autoComplete="email"
          className="w-full rounded-[10px] border border-[#c1a290]/40 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold tracking-wider uppercase">Deine Nachricht</label>
        <textarea
          value={form.message}
          onChange={update("message")}
          rows={6}
          className="w-full rounded-[10px] border border-[#c1a290]/40 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 resize-y"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center gap-2 bg-[#5e3a26] hover:bg-[#4a2d1c] text-white font-bold rounded-[10px] px-6 py-3 text-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        {submitting ? "Wird gesendet…" : "Absenden"}
      </button>
    </form>
  );
}
