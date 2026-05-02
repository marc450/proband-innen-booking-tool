"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Three local UI states drive this page:
//
//   "verifying"   → on first paint, we consume the recovery
//                   `token_hash` via supabase.auth.verifyOtp() to
//                   establish a session. While waiting, we show a
//                   spinner. If the token is missing, expired, or
//                   already used we drop into "invalid".
//
//   "ready"       → recovery session is established. Show the
//                   new-password form. updateUser() commits the change.
//
//   "invalid"     → recovery link could not be consumed. Offer a way
//                   back to /start so the user can request a fresh
//                   reset email.
//
// We use the token-hash flow (not PKCE) because it works cross-browser:
// the user can open the recovery email in a different browser than the
// one that initiated the reset and the link still verifies. PKCE
// requires a verifier in the originating browser's storage.
//
// We don't need to read the user's email here; the recovery session
// already identifies them server-side. updateUser({ password }) writes
// to the right account.

type State = "verifying" | "ready" | "invalid";

const MIN_PASSWORD_LENGTH = 8;

export function ResetPasswordForm() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [state, setState] = useState<State>("verifying");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Recovery email link points back here as
      // /reset-password?token_hash=...&type=recovery. verifyOtp turns
      // the hash into a real session. Cross-browser-safe: no verifier
      // in localStorage required.
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");
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
        setState("ready");
        return;
      }

      // No recovery token in the URL. Either the user navigated here
      // directly or the session was already established on a prior
      // load. Check for an existing session and proceed accordingly.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setState(data.session ? "ready" : "invalid");
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, supabase]);

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
    router.replace("/mein-konto");
  };

  if (state === "verifying") {
    return (
      <div className="bg-white rounded-[10px] shadow-sm p-6 md:p-8 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#0066FF]" />
      </div>
    );
  }

  if (state === "invalid") {
    return (
      <div className="bg-white rounded-[10px] shadow-sm p-6 md:p-8 space-y-5">
        <div className="rounded-md bg-[#FAEBE1] border border-[#F0D0B8] px-3 py-3 text-sm text-black/85 leading-relaxed">
          Dieser Link ist nicht mehr gültig. Möglicherweise wurde er bereits
          verwendet oder ist abgelaufen. Fordere einfach einen neuen Link an.
        </div>
        <Link
          href="/start"
          className="block w-full bg-[#0066FF] hover:bg-[#0055DD] text-white font-bold text-base rounded-[10px] py-3.5 transition-colors text-center"
        >
          Zur Anmeldung
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-[10px] shadow-sm p-6 md:p-8 space-y-5"
    >
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
