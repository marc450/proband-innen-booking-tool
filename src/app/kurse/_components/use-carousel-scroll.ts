"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Geteilter Carousel-Scroll-Helper. Wird von den drei Snap-Scroll
 * Carousels unter src/app/kurse/_components/sections/ benutzt
 * (proband-reviews, reviews, prose). Alle drei haben dieselbe
 * Mechanik:
 *
 *   1. Horizontaler Snap-Scroller mit N Karten, davon X sichtbar
 *      (X = 1 mobile, 2 tablet, 3 desktop via Tailwind-Breakpoints).
 *   2. Dot-Indicators darunter — eine pro erreichbarer Scroll-
 *      Position (NICHT eine pro Karte, weil bei 3-per-view nur
 *      N-2 Positionen tatsächlich anfahrbar sind).
 *   3. Pfeil-Buttons links/rechts auf Desktop, die immer eine Karte
 *      vor- oder zurückspringen.
 *
 * Vor diesem Hook war die gleiche Logik dreimal kopiert. Wenn die
 * Mechanik wieder mal angepasst wird (z.B. Snap-Center statt -Start),
 * passiert die Änderung jetzt an einer Stelle.
 *
 * Markup-Vertrag: jede Karte muss `data-card` haben, damit der Hook
 * sie per querySelectorAll findet. Der Scroller selbst muss die
 * `gap-*` Tailwind-Klasse tragen — der Hook liest den Wert via
 * getComputedStyle aus für die Stride-Berechnung.
 */

export interface UseCarouselScrollResult {
  /** Ref auf den horizontal scrollenden Container. An das äußere
   *  scrollende `<div>` heften. */
  scrollerRef: React.RefObject<HTMLDivElement | null>;
  /** Index der Karte deren linke Kante der linken Scroller-Kante am
   *  nächsten ist. Bestimmt welcher Dot als aktiv leuchten würde
   *  WENN er existiert (siehe activeDotIdx für die geklammte Variante). */
  activeIndex: number;
  /** Indes für `Array.from({length: reachableCount})` Iteration —
   *  garantiert immer im Bereich [0, reachableCount-1], damit der
   *  rechte Dot beim End-Scroll auch leuchtet. */
  activeDotIdx: number;
  /** Anzahl tatsächlich anfahrbarer Snap-Positionen. Bei N Karten
   *  auf X-per-view sind das maximal N-X+1 (auf Mobile = N). Wird
   *  per ResizeObserver nachgemessen, kein Hartcode. */
  reachableCount: number;
  /** Whether der rechte Pfeil-Button enabled werden darf. */
  canNext: boolean;
  /** Whether der linke Pfeil-Button enabled werden darf. */
  canPrev: boolean;
  /** Springt die Karte mit dem gegebenen Index links an die
   *  Scroller-Kante. Nutzt smooth-Scrolling wenn `smoothScroll`
   *  beim Hook-Aufruf gesetzt war. */
  scrollToIndex: (idx: number) => void;
}

export interface UseCarouselScrollOptions {
  /** Hinweis für den Hook, dass sich der Karten-Inhalt geändert hat
   *  (typisch: items.length oder reviews.length). Triggert ein
   *  Re-Measurement der reachableCount, damit ein Pop-In nicht eine
   *  stale Dot-Anzahl zurücklässt. */
  itemCountKey: number;
  /** scrollToIndex mit `behavior: "smooth"`. Default false, weil
   *  smooth-Scrolling in Chromium mit `scroll-snap-type: x mandatory`
   *  in manchen Konstellationen den Animations-Run abbricht und auf
   *  die Ausgangs-Karte zurückspringt. Opt-in pro Carousel. */
  smoothScroll?: boolean;
}

export function useCarouselScroll({
  itemCountKey,
  smoothScroll = false,
}: UseCarouselScrollOptions): UseCarouselScrollResult {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [atEnd, setAtEnd] = useState(false);
  // Default = itemCountKey, damit die Sektion vor dem ersten Measure
  // nicht 0 Dots rendert und dann durch einen Re-Render reinplatzt.
  const [reachableCount, setReachableCount] = useState(itemCountKey);

  // Re-measure reachable scroll positions on mount + every layout
  // change (Viewport-Resize, Font-Load-Reflow, Content-Swap).
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const measure = () => {
      const cards = scroller.querySelectorAll<HTMLElement>("[data-card]");
      if (cards.length === 0) {
        setReachableCount(0);
        return;
      }
      const cardWidth = cards[0].offsetWidth;
      const gapPx = parseFloat(getComputedStyle(scroller).gap) || 0;
      const stride = cardWidth + gapPx;
      const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
      if (stride <= 0 || maxScrollLeft <= 0) {
        // Alle Karten passen ins Sichtfeld, keine Pagination nötig.
        setReachableCount(1);
        return;
      }
      // +1 weil Position 0 (alle Anfangs-Karten sichtbar) auch zählt.
      const positions = Math.floor(maxScrollLeft / stride + 0.5) + 1;
      setReachableCount(Math.min(positions, cards.length));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(scroller);
    return () => ro.disconnect();
  }, [itemCountKey]);

  // Active card = die Karte deren linke Kante der Scroller-linken-
  // Kante am nächsten ist. getBoundingClientRect statt offsetLeft,
  // weil die Scroller negative horizontale Margins haben (für die
  // Edge-to-Edge-Wirkung) und offsetLeft mit scrollLeft uneinig wäre.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const update = () => {
      const cards = Array.from(
        scroller.querySelectorAll<HTMLElement>("[data-card]"),
      );
      if (!cards.length) return;
      const scrollerLeft = scroller.getBoundingClientRect().left;
      let bestIdx = 0;
      let bestDist = Infinity;
      cards.forEach((card, idx) => {
        const dist = Math.abs(
          card.getBoundingClientRect().left - scrollerLeft,
        );
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = idx;
        }
      });
      setActiveIndex(bestIdx);
      setAtEnd(
        scroller.scrollLeft + scroller.clientWidth >=
          scroller.scrollWidth - 1,
      );
    };

    update();
    scroller.addEventListener("scroll", update, { passive: true });
    return () => scroller.removeEventListener("scroll", update);
  }, []);

  const scrollToIndex = (idx: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const card = scroller.querySelectorAll<HTMLElement>("[data-card]")[idx];
    if (!card) return;
    const delta =
      card.getBoundingClientRect().left -
      scroller.getBoundingClientRect().left;
    scroller.scrollTo({
      left: scroller.scrollLeft + delta,
      ...(smoothScroll ? { behavior: "smooth" as const } : {}),
    });
  };

  const canPrev = activeIndex > 0;
  const canNext = !atEnd;
  // Active-Index auf den letzten Dot kappen — sonst bleibt der
  // rechte Dot beim End-Scroll dunkel weil activeIndex weiter rechts
  // läuft als reachableCount-1.
  const activeDotIdx = Math.min(activeIndex, Math.max(0, reachableCount - 1));

  return {
    scrollerRef,
    activeIndex,
    activeDotIdx,
    reachableCount,
    canNext,
    canPrev,
    scrollToIndex,
  };
}
