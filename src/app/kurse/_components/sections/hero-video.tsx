"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Volume2, VolumeX } from "lucide-react";

interface HeroVideoProps {
  videoPath: string;
  videoPoster?: string;
  videoCaptionsPath?: string;
  /**
   * Tailwind aspect classes for the video frame. Defaults to the portrait
   * aspect used on the course hero; override for landscape contexts.
   */
  aspectClassName?: string;
  /**
   * When false, the mute/unmute toggle is hidden and the video stays
   * permanently muted. Defaults to true (toggle visible).
   */
  allowUnmute?: boolean;
  /**
   * Optional `object-position` value applied to the video element
   * (e.g. "40% center"). Useful when the subject is not horizontally
   * centered in the source. Defaults to "center center".
   */
  objectPosition?: string;
}

export function HeroVideo({
  videoPath,
  videoPoster,
  videoCaptionsPath,
  aspectClassName = "aspect-[4/5] md:aspect-[4/3] lg:aspect-[4/5]",
  allowUnmute = true,
  objectPosition,
}: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  // Gate the video's first byte on the poster finishing to load. The poster
  // Image is the LCP element, so this guarantees the (larger) video download
  // never competes with it for bandwidth during the LCP window. Starts true
  // when there is no poster to wait for.
  const [posterReady, setPosterReady] = useState(!videoPoster);

  // Safety net: if the poster's onLoad never fires (e.g. it was already
  // decoded from cache before hydration wired the handler), force the gate
  // open after a short delay so the video still autoplays.
  useEffect(() => {
    if (posterReady) return;
    const t = setTimeout(() => setPosterReady(true), 3000);
    return () => clearTimeout(t);
  }, [posterReady]);

  // Force-kick autoplay once the poster has loaded. The `autoPlay` attribute
  // alone is not reliable across mobile browsers (iOS Safari in particular
  // sometimes ignores it on initial load), so we explicitly call play().
  // Must stay muted + playsInline for autoplay policies to allow it.
  useEffect(() => {
    if (!posterReady) return;
    const video = videoRef.current;
    if (!video) return;

    const tryPlay = () => {
      video.muted = true;
      const p = video.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          // Some browsers still refuse — fall back to play-on-first-interaction
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

    // The poster (LCP element) has loaded. With preload="none" the video's
    // first byte is fetched by this play() call, so starting it now keeps the
    // video download strictly after the LCP resource. Yield one frame first
    // so the poster paints, then play.
    let cancelled = false;
    const onReady = () => {
      tryPlay();
      video.removeEventListener("loadeddata", onReady);
    };
    const raf = requestAnimationFrame(() => {
      if (cancelled) return;
      if (video.readyState >= 2) tryPlay();
      else video.addEventListener("loadeddata", onReady);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      video.removeEventListener("loadeddata", onReady);
    };
  }, [posterReady]);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const next = !muted;
    video.muted = next;
    if (!next) {
      // Best-effort: some browsers require a play() call after unmute
      void video.play().catch(() => {});
    }
    setMuted(next);
  };

  return (
    <div className={`relative rounded-[10px] overflow-hidden bg-black/5 ${aspectClassName}`}>
      {/* The poster is rendered as a real, eager, high-priority <img> so it
          is the LCP element and paints at FCP. A <video poster> attribute is
          treated as a low-priority image by browsers and painted ~1.5 s late
          on throttled mobile (this was the entire LCP gap). The <video>
          below carries no poster and is transparent until it has frames, so
          this image shows through identically until playback covers it, and
          also serves as the still fallback if the video never loads. */}
      {videoPoster && (
        <Image
          src={videoPoster}
          alt=""
          aria-hidden="true"
          fill
          priority
          // The hero occupies a full-width column on mobile and roughly half
          // the row on large screens (lg:grid-cols-2). Sizing the poster to
          // that keeps the LCP resource small (WebP, device-appropriate width)
          // instead of shipping the full 1920px source.
          sizes="(min-width: 1024px) 50vw, 100vw"
          onLoad={() => setPosterReady(true)}
          className="object-cover"
          style={objectPosition ? { objectPosition } : undefined}
        />
      )}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={objectPosition ? { objectPosition } : undefined}
        autoPlay
        muted
        loop
        playsInline
        // No poster attribute: the <img> above is the poster/LCP element.
        // preload="none" plus the deferred play() in the effect keep the
        // large video download out of the LCP window.
        preload="none"
        disableRemotePlayback
      >
        <source src={videoPath} type="video/mp4" />
        {videoCaptionsPath && (
          <track
            kind="captions"
            src={videoCaptionsPath}
            srcLang="de"
            label="Deutsch"
            default
          />
        )}
      </video>

      {/* Mute toggle — prominent "Ton einschalten" pill while muted,
          compact icon-only toggle after unmuting so viewers can mute again.
          Hidden entirely when `allowUnmute` is false. */}
      {allowUnmute && (
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Ton einschalten" : "Ton ausschalten"}
          className={`absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-black/70 hover:bg-black/85 text-white backdrop-blur-sm shadow-lg transition-all duration-300 ${
            muted
              ? "px-4 py-2.5 text-sm font-semibold"
              : "p-2.5"
          }`}
        >
          {muted ? (
            <>
              <VolumeX className="w-4 h-4" />
              <span>Ton einschalten</span>
            </>
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  );
}
