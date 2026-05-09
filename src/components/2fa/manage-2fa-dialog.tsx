"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TotpEnroller } from "./totp-enroller";

// Self-service 2FA management dialog opened from the nav user menu.
// Two states:
//   • Has verified factor → show "aktiv" + a "Deaktivieren" button.
//     Disabling unenrolls all verified TOTP factors and the next
//     login will be password-only again until they re-enroll.
//   • No verified factor → show <TotpEnroller>.
//
// Note: anyone can enroll. The enforcement that admins MUST have
// 2FA happens in the middleware via the /setup-2fa redirect; this
// dialog is for voluntary enrollment by any staff member and for
// admins who want to enroll proactively.

type Status = "loading" | "no-factor" | "has-factor";

export function Manage2faDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const supabase = createClient();
  const [status, setStatus] = useState<Status>("loading");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setStatus("loading");
    setError(null);
    const { data, error: lErr } = await supabase.auth.mfa.listFactors();
    if (lErr) {
      setError(lErr.message);
      setStatus("no-factor");
      return;
    }
    const verified = data?.totp?.find((f) => f.status === "verified");
    if (verified) {
      setFactorId(verified.id);
      setStatus("has-factor");
    } else {
      setFactorId(null);
      setStatus("no-factor");
    }
  };

  useEffect(() => {
    if (open) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleDisable = async () => {
    if (!factorId) return;
    setBusy(true);
    setError(null);
    const { error: uErr } = await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (uErr) {
      setError(uErr.message);
      return;
    }
    await refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Zwei-Faktor-Authentifizierung</DialogTitle>
        </DialogHeader>

        {status === "loading" && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-[#0066FF]" />
          </div>
        )}

        {status === "has-factor" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <span>2FA ist aktiv. Beim nächsten Login wirst Du nach einem Code aus Deiner Authenticator-App gefragt.</span>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Schließen
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisable}
                disabled={busy}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Deaktivieren"}
              </Button>
            </div>
          </div>
        )}

        {status === "no-factor" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-black/80">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              <span>2FA ist noch nicht eingerichtet.</span>
            </div>
            <TotpEnroller
              onSuccess={async () => {
                await refresh();
              }}
              onCancel={() => onOpenChange(false)}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
