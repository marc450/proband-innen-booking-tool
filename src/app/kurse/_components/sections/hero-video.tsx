"use client";

import { useRef, useState } from "react";
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
}

export function HeroVideo({
  videoPath,
  videoPoster,
  videoCaptionsPath,
  aspectClassName = "aspect-[4/5] md:aspect-[4/3] lg:aspect-[4/5]",
}: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

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
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        poster={videoPoster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        disableRemotePlayback
        // @ts-expect-error fetchpriority is valid HTML but not yet in React types
        fetchpriority="high"
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
          compact icon-only toggle after unmuting so viewers can mute again. */}
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
    </div>
  );
}
