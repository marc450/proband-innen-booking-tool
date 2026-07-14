"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Multi-step login flow for ephia.de/start. Three states drive the UI:
//
//   "email"          → email input + Weiter button.
//                      Calls /api/auth/check-email on submit.
//
//   "has_password"   → password input + Anmelden button.
//                      Calls supabase.auth.signInWithPassword on submit.
//
//   "needs_password" → password set form (entry + confirmation).
//                      Calls /api/auth/set-password to create the
//                      Supabase user, then signInWithPassword to
//                      establish the session.
//
//   "not_a_customer" → friendly explanation + link back to courses.
//
// All transitions are local; we never reload the page. The same email
// stays at the top so the user has context (we display it greyed-out
// on every state after the first).

type Step =
  | { kind: "email" }
  | {
      kind: "has_password";
      email: string;
      first_name: string | null;
    }
  | {
      kind: "needs_password";
      email: string;
      first_name: string | null;
    }
  | { kind: "reset_requested"; email: string }
  | { kind: "not_a_customer"; email: string };

// Where to send the user after a successful sign-in. Honors a `?next=`
// query param so the LW SSO bridge (/api/auth/lw-sso) can bounce a
// logged-out user through here and back to itself. Same-origin paths
// only — anything else falls back to /mein-konto so we can't be
// abused as an open redirect.
function getPostLoginDestination(): string {
  const fallback = "/mein-konto";
  if (typeof window === "undefined") return fallback;
  const next = new URLSearchParams(window.location.search).get("next");
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

// Navigate post-login. For internal page routes we use the SPA router;
// for API routes (e.g. /api/auth/lw-sso, the LW bounce) we force a
// real navigation since the App Router can't render API responses
// client-side.
function navigatePostLogin(
  router: ReturnType<typeof useRouter>,
  mode: "push" | "replace",
): void {
  const dest = getPostLoginDestination();
  if (dest.startsWith("/api/")) {
    window.location.href = dest;
    return;
  }
  if (mode === "replace") router.replace(dest);
  else router.push(dest);
}

export function StartForm() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<Step>({ kind: "email" });

  // If the user is already logged in when they hit /start (e.g. they
  // refreshed after a successful login), skip straight to /mein-konto.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled && data.session) navigatePostLogin(router, "replace");
    })();
    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  return (
    <div className="bg-white rounded-[10px] shadow-sm p-6 md:p-8">
      {step.kind === "email" && <EmailStep onNext={setStep} />}
      {step.kind === "has_password" && (
        <PasswordStep
          email={step.email}
          firstName={step.first_name}
          onBack={() => setStep({ kind: "email" })}
          onForgot={() => setStep({ kind: "reset_requested", email: step.email })}
        />
      )}
      {step.kind === "needs_password" && (
        <SetPasswordStep
          email={step.email}
          firstName={step.first_name}
          onBack={() => setStep({ kind: "email" })}
        />
      )}
      {step.kind === "reset_requested" && (
        <ResetRequestedStep
          email={step.email}
          onBack={() => setStep({ kind: "email" })}
        />
      )}
      {step.kind === "not_a_customer" && (
        <NotACustomerStep
          email={step.email}
          onBack={() => setStep({ kind: "email" })}
        />
      )}
    </div>
  );
}

/* ─────────────────────────── Step 1: email ─────────────────────────── */

function EmailStep({ onNext }: { onNext: (step: Step) => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Etwas ist schiefgelaufen.");
        return;
      }
      const lower = email.trim().toLowerCase();
      if (data.status === "has_password") {
        onNext({ kind: "has_password", email: lower, first_name: data.first_name });
      } else if (data.status === "needs_password") {
        onNext({ kind: "needs_password", email: lower, first_name: data.first_name });
      } else {
        onNext({ kind: "not_a_customer", email: lower });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Netzwerkfehler.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-semibold text-black">
          E-Mail
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          className="w-full border-2 border-[#0066FF] rounded-[10px] px-4 py-3 text-sm text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/30 transition-shadow"
          placeholder="deine@email.de"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading || !email.trim()}
        className="w-full bg-[#0066FF] hover:bg-[#0055DD] text-white font-bold text-base rounded-[10px] py-3.5 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
          <>
            Weiter
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}

/* ──────────────────── Step 2a: existing user, sign in ──────────────────── */

function PasswordStep({
  email,
  firstName,
  onBack,
  onForgot,
}: {
  email: string;
  firstName: string | null;
  onBack: () => void;
  onForgot: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signErr) {
      setError(
        signErr.message === "Invalid login credentials"
          ? "Falsches Passwort."
          : signErr.message,
      );
      setLoading(false);
      return;
    }
    navigatePostLogin(router, "push");
  };

  // Sends the EPHIA-branded recovery email via our own endpoint and
  // transitions to the "reset_requested" confirmation step. The endpoint
  // returns 200 unconditionally, so we never surface errors here and
  // never leak whether the address has an account.
  const handleForgot = async () => {
    if (resetting) return;
    setResetting(true);
    try {
      await fetch("/api/auth/request-customer-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Swallow — the confirmation UX is intentionally identical whether
      // or not the send succeeded.
    } finally {
      onForgot();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <EmailContext email={email} onBack={onBack} />
      {firstName && (
        <p className="text-sm text-black/80">
          Hallo <span className="font-semibold">{firstName}</span>, schön Dich wiederzusehen.
        </p>
      )}
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-semibold text-black">
          Passwort
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
          className="w-full border-2 border-[#0066FF] rounded-[10px] px-4 py-3 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#0066FF]/30 transition-shadow"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading || !password}
        className="w-full bg-[#0066FF] hover:bg-[#0055DD] text-white font-bold text-base rounded-[10px] py-3.5 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Anmelden"}
      </button>
      <button
        type="button"
        onClick={handleForgot}
        disabled={resetting}
        className="w-full text-sm text-[#0066FF] hover:underline font-medium disabled:opacity-60 flex items-center justify-center gap-1.5"
      >
        {resetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        Passwort vergessen?
      </button>
    </form>
  );
}

/* ──────────────── Step 2d: reset email sent ──────────────── */

function ResetRequestedStep({
  email,
  onBack,
}: {
  email: string;
  onBack: () => void;
}) {
  return (
    <div className="space-y-5">
      <EmailContext email={email} onBack={onBack} />
      <div className="rounded-md bg-[#FAEBE1] border border-[#F0D0B8] px-3 py-3 space-y-2">
        <p className="text-sm font-semibold text-black">
          E-Mail unterwegs.
        </p>
        <p className="text-sm text-black/85 leading-relaxed">
          Falls ein Konto mit dieser E-Mail existiert, haben wir Dir gerade
          einen Link zum Zurücksetzen Deines Passworts geschickt. Schau auch
          in Deinem Spam-Ordner nach.
        </p>
      </div>
      <button
        type="button"
        onClick={onBack}
        className="w-full text-sm text-[#0066FF] hover:underline font-medium"
      >
        Zurück zur Anmeldung
      </button>
    </div>
  );
}

/* ──────────────── Step 2b: known customer, no password yet ──────────────── */

// The doctor has a booking but no login yet. We never let them set a
// password inline (that let anyone who knew the email claim the account).
// Instead the secure set-password link is in their course confirmation
// email; here we explain that and offer to resend a fresh link.
function SetPasswordStep({
  email,
  firstName,
  onBack,
}: {
  email: string;
  firstName: string | null;
  onBack: () => void;
}) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (sending) return;
    setSending(true);
    try {
      await fetch("/api/auth/send-password-setup-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // The confirmation UX is intentionally identical whether or not the
      // send succeeded, so we never leak whether the address has an account.
    } finally {
      setSent(true);
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="space-y-5">
        <EmailContext email={email} onBack={onBack} />
        <div className="rounded-md bg-[#FAEBE1] border border-[#F0D0B8] px-3 py-3 space-y-2">
          <p className="text-sm font-semibold text-black">E-Mail unterwegs.</p>
          <p className="text-sm text-black/85 leading-relaxed">
            Falls ein Konto mit dieser E-Mail existiert, haben wir Dir gerade
            einen Link zum Einrichten Deines Passworts geschickt. Schau auch in
            Deinem Spam-Ordner nach. Der Link ist 30 Tage gültig.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="w-full text-sm text-[#0066FF] hover:underline font-medium"
        >
          Zurück zur Anmeldung
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <EmailContext email={email} onBack={onBack} />
      <div className="rounded-md bg-[#FAEBE1] border border-[#F0D0B8] px-3 py-3 space-y-2">
        <p className="text-sm font-semibold text-black">
          Hallo {firstName ? <span>{firstName}</span> : "Du"}, willkommen zurück.
        </p>
        <p className="text-sm text-black/85 leading-relaxed">
          Mit Deiner Buchungsbestätigung haben wir Dir einen Link geschickt, mit
          dem Du einmalig Dein Passwort einrichtest. Nicht erhalten? Wir senden
          ihn Dir gerne erneut.
        </p>
      </div>
      <button
        type="button"
        onClick={handleSend}
        disabled={sending}
        className="w-full bg-[#0066FF] hover:bg-[#0055DD] text-white font-bold text-base rounded-[10px] py-3.5 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Link zum Einrichten senden"}
      </button>
    </div>
  );
}

/* ─────────────────── Step 2c: not a customer ─────────────────── */

function NotACustomerStep({ email, onBack }: { email: string; onBack: () => void }) {
  return (
    <div className="space-y-5">
      <EmailContext email={email} onBack={onBack} />
      <div className="rounded-md bg-[#FAEBE1] border border-[#F0D0B8] px-3 py-3 text-sm text-black/85 leading-relaxed">
        Wir haben kein Konto für diese E-Mail-Adresse. Hast Du Dich vielleicht mit einer anderen Adresse bei uns registriert?
        Falls Du noch keinen Kurs gebucht hast, schau Dich gerne in unserem Kursangebot um.
      </div>
      <Link
        href="/unsere-kurse"
        className="block w-full bg-[#0066FF] hover:bg-[#0055DD] text-white font-bold text-base rounded-[10px] py-3.5 transition-colors text-center"
      >
        Kurse ansehen
      </Link>
      <button
        type="button"
        onClick={onBack}
        className="w-full text-sm text-[#0066FF] hover:underline font-medium"
      >
        Mit anderer E-Mail erneut versuchen
      </button>
    </div>
  );
}

/* ───────────────────────── Shared sub-components ───────────────────────── */

function EmailContext({ email, onBack }: { email: string; onBack: () => void }) {
  return (
    <div className="flex items-center justify-between text-xs text-black/70 -mt-1">
      <span>
        Angemeldet als <span className="font-medium text-black">{email}</span>
      </span>
      <button
        type="button"
        onClick={onBack}
        className="text-[#0066FF] hover:underline font-medium"
      >
        ändern
      </button>
    </div>
  );
}
