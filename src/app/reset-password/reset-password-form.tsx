"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Admin reset-password form. Mirrors the customer flow at
// src/app/kurse/reset-password/reset-password-form.tsx but lands on
// /dashboard after success and is styled to match the admin login
// (white card on bg-background, single brand-blue button).
//
// Four local UI states drive this page:
//
//   "verifying"   → on first paint, we consume the recovery
//                   `token_hash` via supabase.auth.verifyOtp() to
//                   establish a session. While waiting, we show a
//                   spinner. If the token is missing, expired, or
//                   already used we drop into "invalid".
//
//   "mfa"         → recovery session exists but the account has MFA
//                   enabled, so the session is only AAL1. Supabase
//                   refuses to update the password until the session is
//                   elevated to AAL2. We prompt for the 6-digit TOTP
//                   code and run mfa.challenge() + mfa.verify() to
//                   elevate, then fall through to "ready".
//
//   "ready"       → session is at the required assurance level. Show the
//                   new-password form. updateUser() commits the change.
//
//   "invalid"     → recovery link could not be consumed. Offer a way
//                   back to /login so the user can request a fresh
//                   reset email.
//
// We use the token-hash flow (not PKCE) so the user can open the
// recovery email in a different browser than the one that initiated
// the reset and the link still verifies.

type State = "verifying" | "mfa" | "ready" | "invalid";

const MIN_PASSWORD_LENGTH = 8;

// After verifyOtp we may hold only an AAL1 session. If the account has a
// verified TOTP factor, Supabase requires AAL2 before updateUser can
// touch the password. Returns the factorId to challenge, or null when
// the session is already good enough (no MFA, or already AAL2).
async function mfaFactorIdIfElevationNeeded(
  supabase: ReturnType<typeof createClient>,
): Promise<string | null> {
  const { data: aal } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!aal || aal.nextLevel !== "aal2" || aal.currentLevel === "aal2") {
    return null;
  }
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const totp = factors?.totp?.[0];
  return totp?.id ?? null;
}

export function ResetPasswordForm() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [state, setState] = useState<State>("verifying");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      const settle = async () => {
        const id = await mfaFactorIdIfElevationNeeded(supabase);
        if (cancelled) return;
        if (id) {
          setFactorId(id);
          setState("mfa");
        } else {
          setState("ready");
        }
      };

      if (tokenHash && type === "recovery") {
        const { error: vErr } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        if (cancelled) return;
        if (vErr) {
          setState("invalid");
          return;
        }
        await settle();
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        setState("invalid");
        return;
      }
      await settle();
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, supabase]);

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    setSubmitting(true);
    setError(null);
    const { data: challenge, error: cErr } =
      await supabase.auth.mfa.challenge({ factorId });
    if (cErr || !challenge) {
      setError(cErr?.message || "MFA-Prüfung fehlgeschlagen.");
      setSubmitting(false);
      return;
    }
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: mfaCode.trim(),
    });
    if (vErr) {
      setError(vErr.message || "Code ungültig. Bitte versuche es erneut.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    setState("ready");
  };

  const passwordsMatch = password === confirm;
  const passwordLongEnough = password.length >= MIN_PASSWORD_LENGTH;
  const canSubmit = passwordLongEnough && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: updErr } = await supabase.auth.updateUser({ password });
    if (updErr) {
      setError(updErr.message || "Passwort konnte nicht gesetzt werden.");
      setSubmitting(false);
      return;
    }
    router.replace("/dashboard");
  };

  if (state === "verifying") {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-[#0066FF]" />
      </div>
    );
  }

  if (state === "invalid") {
    return (
      <div className="space-y-5">
        <div className="rounded-md bg-[#FAEBE1] border border-[#F0D0B8] px-3 py-3 text-sm text-black/85 leading-relaxed">
          Dieser Link ist nicht mehr gültig. Möglicherweise wurde er bereits
          verwendet oder ist abgelaufen. Fordere einfach einen neuen Link an.
        </div>
        <Link
          href="/login"
          className="block w-full bg-[#0066FF] hover:bg-[#0055DD] text-white font-bold text-base rounded-[10px] py-3.5 transition-colors text-center"
        >
          Zur Anmeldung
        </Link>
      </div>
    );
  }

  if (state === "mfa") {
    return (
      <form onSubmit={handleMfaSubmit} className="space-y-5">
        <p className="text-sm text-black/70 leading-relaxed">
          Dein Konto ist mit Zwei-Faktor-Authentifizierung geschützt. Gib den
          6-stelligen Code aus Deiner Authenticator-App ein, um fortzufahren.
        </p>
        <div className="space-y-1.5">
          <label htmlFor="mfaCode" className="block text-sm font-semibold text-black">
            Bestätigungscode
          </label>
          <input
            id="mfaCode"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
            required
            autoFocus
            className="w-full border-2 border-[#0066FF] rounded-[10px] px-4 py-3 text-sm text-black tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-[#0066FF]/30 transition-shadow"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting || mfaCode.length < 6}
          className="w-full bg-[#0066FF] hover:bg-[#0055DD] text-white font-bold text-base rounded-[10px] py-3.5 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Weiter"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-semibold text-black">
          Neues Passwort
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
          minLength={MIN_PASSWORD_LENGTH}
          className="w-full border-2 border-[#0066FF] rounded-[10px] px-4 py-3 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#0066FF]/30 transition-shadow"
        />
        <p className="text-xs text-black/60">Mindestens {MIN_PASSWORD_LENGTH} Zeichen.</p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="confirm" className="block text-sm font-semibold text-black">
          Passwort wiederholen
        </label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={MIN_PASSWORD_LENGTH}
          className="w-full border-2 border-[#0066FF] rounded-[10px] px-4 py-3 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#0066FF]/30 transition-shadow"
        />
      </div>
      {confirm.length > 0 && !passwordsMatch && (
        <p className="text-sm text-red-600">Die Passwörter stimmen nicht überein.</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting || !canSubmit}
        className="w-full bg-[#0066FF] hover:bg-[#0055DD] text-white font-bold text-base rounded-[10px] py-3.5 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Passwort speichern"}
      </button>
    </form>
  );
}
