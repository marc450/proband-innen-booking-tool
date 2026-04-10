"use client";

import { useEffect, useState } from "react";

interface StickyMobileCtaProps {
  label: string;
  /** Anchor id (without the #) of the section the button scrolls to. */
  targetId: string;
}

/**
 * Small sticky CTA bar that appears at the bottom on mobile once the user has
 * scrolled past the hero. Hides again when the target section (`targetId`) is
 * in view so it never overlaps the actual booking cards. Desktop: hidden.
 */
export function StickyMobileCta({ label, targetId }: StickyMobileCtaProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;

    // Show the bar only after the user scrolls past the first viewport (hero)
    // and hide it again while the target section is in view.
    let pastHero = false;
    let targetInView = false;

    const onScroll = () => {
      pastHero = window.scrollY > window.innerHeight * 0.6;
      setVisible(pastHero && !targetInView);
    };

    const io = new IntersectionObserver(
      (entries) => {
        targetInView = entries[0]?.isIntersecting ?? false;
        setVisible(pastHero && !targetInView);
      },
      { threshold: 0.1 },
    );
    io.observe(target);

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, [targetId]);

  return (
    <div
      aria-hidden={!visible}
      className={`lg:hidden fixed bottom-0 inset-x-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 pointer-events-none transition-transform duration-300 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div
        className="pointer-events-auto bg-white rounded-[12px] shadow-2xl ring-1 ring-black/5 flex items-center justify-between gap-3 px-4 py-3"
      >
        <span className="text-sm font-semibold text-black">{label}</span>
        <a
          href={`#${targetId}`}
          className="inline-block text-sm font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-4 py-2.5 transition-colors whitespace-nowrap"
        >
          Zu den Angeboten
        </a>
      </div>
    </div>
  );
}
