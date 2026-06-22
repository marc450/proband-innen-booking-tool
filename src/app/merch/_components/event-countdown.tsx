"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import {
  COMMUNITY_PICKUP_EVENT,
  isPickupOpen,
  msUntilPickupCutoff,
} from "@/lib/merch-pickup";

/**
 * Event banner with a live countdown to midnight. While the community
 * event pickup window is open, the merch store offers free pickup for
 * every product. The instant the countdown reaches zero (midnight,
 * Europe/Berlin) this banner disappears and the store reverts to its
 * normal shipping-only design. The same cutoff (isPickupOpen) drives the
 * checkout modal's pickup option, so banner and checkout stay in sync.
 */
export function EventCountdown() {
  // Avoid an SSR/CSR hydration mismatch: render nothing until mounted,
  // then drive the countdown off the client clock, ticking every second.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (now == null) return null;
  const current = new Date(now);
  if (!isPickupOpen(current)) return null;

  const totalSeconds = Math.floor(msUntilPickupCutoff(current) / 1000);
  const hh = Math.floor(totalSeconds / 3600);
  const mm = Math.floor((totalSeconds % 3600) / 60);
  const ss = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="bg-[#0066FF] text-white">
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-4 flex flex-col items-center gap-2 text-center">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
          <span className="font-bold text-base md:text-lg">
            Community Event heute · Abholung ohne Versand
          </span>
          <span
            className="font-mono font-bold tabular-nums text-lg bg-[#FAEBE1] text-[#0066FF] rounded-[10px] px-3 py-1"
            aria-label={`Noch ${hh} Stunden, ${mm} Minuten, ${ss} Sekunden`}
          >
            {pad(hh)}:{pad(mm)}:{pad(ss)}
          </span>
        </div>
        <p className="flex items-center gap-1.5 text-xs md:text-sm text-white/90">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span>
            {COMMUNITY_PICKUP_EVENT.dateLabel}, {COMMUNITY_PICKUP_EVENT.timeLabel}{" "}
            · {COMMUNITY_PICKUP_EVENT.location}
          </span>
        </p>
      </div>
    </div>
  );
}
