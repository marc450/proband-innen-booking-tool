"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Three local UI states:
//
//   "verifying" → on first paint, GET the token route to check the link
//                 is valid (and fetch the first name for the greeting).
//   "ready"     → valid token; show the new-password form. On submit we
//                 POST { token, password }, then signInWithPassword to
//                 establish the session.
//   "invalid"   → token missing / expired / already used. Offer a way
//                 back to /start to request a fresh link.

type State = "verifying" | "ready" | "invalid";

const MIN_PASSWORD_LENGTH = 8;

export function SetupPasswordForm() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [state, setState] = useState<State>("verifying");
  const [firstName, setFirstName] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setState("invalid");
        return;
      }
      try {
        const res = await fetch(
          `/api/auth/set-password-with-token?token=${encodeURIComponent(token)}`,
        );
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.ok) {
          setFirstName(data.firstName ?? null);
          setState("ready");
        } else {
          setState("invalid");
        }
      } catch {
        if (!cancelled) setState("invalid");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const passwordsMatch = password === confirm;
  const passwordLongEnough = password.length >= MIN_PASSWORD_LENGTH;
  const canSubmit = passwordLongEnough && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/set-password-with-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Passwort konnte nicht gesetzt werden.");
        setSubmitting(false);
        return;
      }
      // Password is set server-side; establish the browser session.
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: data.email,
        password,
      });
      if (signErr) {
        // The password was set successfully; only the sign-in hiccuped.
        // Send them to the login page rather than showing an error.
        router.replace("/start");
        return;
      }
      router.replace("/mein-konto");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Netzwerkfehler.");
      setSubmitting(false);
    }
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
          verwendet oder ist abgelaufen. Gib auf der Anmeldeseite einfach Deine
          E-Mail ein, dann schicken wir Dir einen neuen Link.
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
      {firstName && (
        <p className="text-sm text-black/80">
          Hallo <span className="font-semibold">{firstName}</span>, lege jetzt
          Dein Passwort fest.
        </p>
      )}
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
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Passwort speichern und anmelden"}
      </button>
    </form>
  );
}
