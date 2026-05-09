"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// User has a verified TOTP factor and an aal1 session. We pick the
// first verified factor, request a challenge, and submit the code to
// upgrade the session to aal2. Then the middleware lets them into
// /dashboard.
//
// If the user has no verified factor (e.g. they got here by typing
// the URL directly), we boot them to /dashboard — the middleware will
// either let them through (no factors → no MFA needed) or send them
// to /setup-2fa (admin without factor).

export function Verify2faForm() {
  const router = useRouter();
  const supabase = createClient();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: lErr } = await supabase.auth.mfa.listFactors();
      if (cancelled) return;
      if (lErr) {
        setError(lErr.message);
        setLoading(false);
        return;
      }
      const verified = data?.totp?.find((f) => f.status === "verified");
      if (!verified) {
        router.replace("/dashboard");
        return;
      }
      setFactorId(verified.id);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    setVerifying(true);
    setError(null);

    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({
      factorId,
    });
    if (chErr || !ch) {
      setError(chErr?.message ?? "Challenge fehlgeschlagen.");
      setVerifying(false);
      return;
    }

    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: ch.id,
      code: code.trim(),
    });
    if (vErr) {
      setError(
        vErr.message?.includes("Invalid")
          ? "Code stimmt nicht. Bitte erneut versuchen."
          : vErr.message ?? "Verifizierung fehlgeschlagen.",
      );
      setVerifying(false);
      return;
    }

    // Hard navigation instead of router.replace: forces the browser
    // to fully reload, so the middleware sees the freshly-updated
    // aal2 session cookie on the next request. router.replace was
    // observably hanging in production after a successful verify
    // (form stuck on spinner), most likely an App Router cache /
    // middleware-state race after the session cookie rotates.
    window.location.assign("/dashboard");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-[#0066FF]" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="totp-code" className="block text-sm font-semibold text-black">
          6-stelliger Code
        </label>
        <input
          id="totp-code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\s/g, ""))}
          required
          maxLength={6}
          autoFocus
          placeholder="123456"
          className="w-full border-2 border-[#0066FF] rounded-[10px] px-4 py-3 text-center text-lg tracking-widest font-mono text-black focus:outline-none focus:ring-2 focus:ring-[#0066FF]/30 transition-shadow"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={verifying || code.length !== 6}
        className="w-full bg-[#0066FF] hover:bg-[#0055DD] text-white font-bold text-base rounded-[10px] py-3.5 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Bestätigen"}
      </button>

      <div className="text-center">
        <button
          type="button"
          onClick={handleSignOut}
          className="text-sm text-black/60 hover:underline"
        >
          Abbrechen und abmelden
        </button>
      </div>
    </form>
  );
}
