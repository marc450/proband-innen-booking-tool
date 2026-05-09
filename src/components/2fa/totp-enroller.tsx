"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Reusable TOTP enrollment widget. Used in two contexts:
//   • Self-service via the nav user menu → manage-2fa-dialog.tsx
//   • Forced flow for admins without a verified factor → /setup-2fa
//
// Flow:
//   1. enroll({ factorType: "totp" }) returns { id, totp: { qr_code, secret } }.
//      qr_code is an SVG data-URI we can render directly. secret is the
//      Base32 the user can type into authenticators that don't scan.
//   2. User scans, types the 6-digit code.
//   3. challenge({ factorId }) → challengeId.
//   4. verify({ factorId, challengeId, code }) → factor flips from
//      "unverified" to "verified", session upgrades to aal2.
//
// On verify, we call onSuccess() and let the parent decide where to go.
// If the user dismisses without verifying, we unenroll() the factor so
// half-enrolled state doesn't accumulate (Supabase free tier allows
// limited factors per user).

interface EnrollState {
  factorId: string;
  qrCode: string;
  secret: string;
}

export function TotpEnroller({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel?: () => void;
}) {
  const supabase = createClient();
  const [state, setState] = useState<EnrollState | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // First, drop any previously enrolled-but-unverified TOTP factor
      // to avoid the "max factors reached" error if the user opened the
      // dialog before, scanned but never verified, and is now back.
      // Note: listFactors().totp is pre-filtered to verified factors,
      // so we look at .all to find unverified-but-still-enrolled ones.
      const { data: existing } = await supabase.auth.mfa.listFactors();
      const stale = existing?.all?.find(
        (f) => f.factor_type === "totp" && f.status === "unverified",
      );
      if (stale) await supabase.auth.mfa.unenroll({ factorId: stale.id });

      const { data, error: enrollErr } = await supabase.auth.mfa.enroll({
        factorType: "totp",
      });
      if (cancelled) return;
      if (enrollErr || !data) {
        setError(enrollErr?.message ?? "Enrollment fehlgeschlagen.");
        setLoading(false);
        return;
      }
      setState({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // Clean up the unverified factor if the parent unmounts us before the
  // user verifies (e.g. dialog closed). Skipped if verified=true since
  // by then the factor is permanent.
  useEffect(() => {
    return () => {
      if (state && !verified) {
        supabase.auth.mfa.unenroll({ factorId: state.factorId }).catch(() => {});
      }
    };
  }, [state, verified, supabase]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state) return;
    setVerifying(true);
    setError(null);

    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({
      factorId: state.factorId,
    });
    if (chErr || !ch) {
      setError(chErr?.message ?? "Challenge fehlgeschlagen.");
      setVerifying(false);
      return;
    }

    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId: state.factorId,
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

    setVerified(true);
    onSuccess();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-[#0066FF]" />
      </div>
    );
  }

  if (error && !state) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">{error}</p>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Schließen
          </Button>
        )}
      </div>
    );
  }

  if (!state) return null;

  return (
    <form onSubmit={handleVerify} className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm text-black/80 leading-relaxed">
          Scanne diesen QR-Code mit Deiner Authenticator-App (Google
          Authenticator, Authy, 1Password, ...).
        </p>
        <div
          className="bg-white p-3 rounded-[10px] inline-block"
          dangerouslySetInnerHTML={{ __html: state.qrCode }}
        />
        <p className="text-xs text-black/60">
          Kein Scanner zur Hand? Gib den Schlüssel manuell ein:
        </p>
        <code className="block w-full text-xs font-mono bg-gray-50 px-3 py-2 rounded-[10px] break-all">
          {state.secret}
        </code>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="totp-code">6-stelliger Code aus der App</Label>
        <Input
          id="totp-code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\s/g, ""))}
          required
          maxLength={6}
          placeholder="123456"
          autoFocus
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Abbrechen
          </Button>
        )}
        <Button type="submit" disabled={verifying || code.length !== 6}>
          {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aktivieren"}
        </Button>
      </div>
    </form>
  );
}
