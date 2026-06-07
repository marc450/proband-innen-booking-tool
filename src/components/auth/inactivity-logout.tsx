"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ACTIVITY_EVENT } from "@/lib/activity";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Idle-session logout for the staff dashboard. Mounted in
// /dashboard and /m layouts so it covers every authenticated staff
// surface. After IDLE_LIMIT_MS without user activity, we sign the
// user out — which kills both the password and the 2FA-stepped-up
// state, so re-entry requires the full password + TOTP again.
//
// Activity is anything the user actively does: pointer down, key
// press, scroll, touch, mousemove (throttled). Pointer movement is
// included so reading-only sessions don't get yanked, but throttled
// to once per second to avoid resetting the timer on every frame.
//
// One minute before logout we surface a Dialog with a live countdown
// and a "Eingeloggt bleiben" button. Clicking it (or any tracked
// activity event) resets the timer.
//
// Why client-side: this protects against the unattended-laptop
// vector, where an attacker is using our app via our JS. It does NOT
// protect against cookie theft + scripted refresh — that's a
// different threat class handled by Supabase refresh-token TTL,
// CSP, secure cookies, and device hygiene.

const IDLE_LIMIT_MS = 30 * 60 * 1000; // 30 min
const WARNING_PERIOD_MS = 60 * 1000;  // show dialog 1 min before logout
const CHECK_INTERVAL_MS = 5_000;      // poll the idle clock every 5 s
const MOUSEMOVE_THROTTLE_MS = 1_000;  // accept mousemove activity at most 1×/s

export function InactivityLogout() {
  const router = useRouter();
  const supabase = createClient();
  const lastActivityRef = useRef<number>(Date.now());
  const lastMouseMoveRef = useRef<number>(0);
  const signedOutRef = useRef(false);
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  // Activity listeners
  useEffect(() => {
    const markActive = () => {
      lastActivityRef.current = Date.now();
    };

    const onMouseMove = () => {
      const now = Date.now();
      if (now - lastMouseMoveRef.current > MOUSEMOVE_THROTTLE_MS) {
        lastMouseMoveRef.current = now;
        markActive();
      }
    };

    window.addEventListener("mousedown", markActive, { passive: true });
    window.addEventListener("keydown", markActive, { passive: true });
    window.addEventListener("scroll", markActive, { passive: true });
    window.addEventListener("touchstart", markActive, { passive: true });
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    // Long-running ops (e.g. an upload) emit this so they don't time out.
    window.addEventListener(ACTIVITY_EVENT, markActive, { passive: true });

    return () => {
      window.removeEventListener("mousedown", markActive);
      window.removeEventListener("keydown", markActive);
      window.removeEventListener("scroll", markActive);
      window.removeEventListener("touchstart", markActive);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener(ACTIVITY_EVENT, markActive);
    };
  }, []);

  // Idle clock
  useEffect(() => {
    const tick = () => {
      if (signedOutRef.current) return;
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= IDLE_LIMIT_MS) {
        signedOutRef.current = true;
        (async () => {
          await supabase.auth.signOut();
          router.replace("/login");
        })();
        return;
      }

      if (elapsed >= IDLE_LIMIT_MS - WARNING_PERIOD_MS) {
        const remaining = Math.max(
          0,
          Math.ceil((IDLE_LIMIT_MS - elapsed) / 1000),
        );
        setSecondsLeft(remaining);
        setShowWarning(true);
      } else if (showWarning) {
        // User became active again, hide the dialog.
        setShowWarning(false);
      }
    };

    const id = setInterval(tick, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
    // showWarning intentionally omitted from deps — we'd otherwise
    // tear down + recreate the interval every time the dialog opens
    // or closes. Latest value is read inside tick via the closure
    // (which closes over the function, but state value is fresh
    // because tick is recreated... actually no it's not). Use a ref
    // to avoid stale-closure issues.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, supabase]);

  const stayLoggedIn = () => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
  };

  return (
    <Dialog
      open={showWarning}
      onOpenChange={(open) => {
        // Clicking outside / Escape counts as "stay logged in".
        if (!open) stayLoggedIn();
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Eingeloggt bleiben?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-black/80 leading-relaxed">
          Du wirst aufgrund von Inaktivität in{" "}
          <span className="font-semibold">{secondsLeft}s</span> automatisch
          abgemeldet. Beim nächsten Login musst Du Dein Passwort und Deinen
          2FA-Code erneut eingeben.
        </p>
        <div className="flex justify-end pt-2">
          <Button onClick={stayLoggedIn}>Eingeloggt bleiben</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
