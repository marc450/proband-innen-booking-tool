"use client";

import { useEffect, useRef } from "react";

interface BackgroundVideoProps {
  videoPath: string;
  /** 0-100. Lower = fainter. Defaults to 25. */
  opacityPercent?: number;
  className?: string;
}

/**
 * Full-bleed muted looping video used as a dim backdrop (e.g. the mobile
 * hero on /werde-proband-in). Fills its nearest positioned ancestor via
 * `absolute inset-0`. Mirrors the autoplay-kick dance from HeroVideo so
 * iOS Safari reliably starts playback on page load.
 */
export function BackgroundVideo({
  videoPath,
  opacityPercent = 25,
  className = "",
}: BackgroundVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tryPlay = () => {
      video.muted = true;
      const p = video.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          const onInteract = () => {
            void video.play().catch(() => {});
            window.removeEventListener("touchstart", onInteract);
            window.removeEventListener("click", onInteract);
          };
          window.addEventListener("touchstart", onInteract, { passive: true });
          window.addEventListener("click", onInteract);
        });
      }
    };

    if (video.readyState >= 2) {
      tryPlay();
    } else {
      const onReady = () => {
        tryPlay();
        video.removeEventListener("loadeddata", onReady);
      };
      video.addEventListener("loadeddata", onReady);
      return () => video.removeEventListener("loadeddata", onReady);
    }
  }, []);

  return (
    <video
      ref={videoRef}
      aria-hidden="true"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      disableRemotePlayback
      className={`absolute inset-0 w-full h-full object-cover pointer-events-none ${className}`}
      style={{ opacity: opacityPercent / 100 }}
    >
      <source src={videoPath} type="video/mp4" />
    </video>
  );
}
