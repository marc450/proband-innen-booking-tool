// Cloudflare Stream video player.
//
// Uses vidstack instead of the Stream-hosted iframe so we can expose
// the manual quality selector. Cloudflare Stream auto-encodes the
// source into multiple HLS renditions (1080p / 720p / 480p / 360p /
// 240p); the iframe player only ever exposes Speed, while vidstack's
// default layout renders a full Settings menu including Quality.
//
// HLS manifest URL pattern:
//   https://<customer-subdomain>/<videoId>/manifest/video.m3u8
//
// videoId === null shows a "Video wird vorbereitet" placeholder so
// freshly seeded video lessons render gracefully before the file is
// uploaded.
"use client";

import { MediaPlayer, MediaProvider } from "@vidstack/react";
import {
  defaultLayoutIcons,
  DefaultVideoLayout,
} from "@vidstack/react/player/layouts/default";

import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import "./player-overrides.css";

const CF_DOMAIN =
  process.env.NEXT_PUBLIC_CF_STREAM_CUSTOMER_DOMAIN ||
  "customer-pimyxl0m3pl3lwao.cloudflarestream.com";

type Props = {
  videoId: string | null;
  // When true, the player fills its parent container's exact height
  // and width (used for dedicated video lesson pages where the player
  // sits in a flex-1 slot). When false (default), the player keeps a
  // 16:9 aspect ratio sized by its parent's width — the right shape
  // for inline videos inside a text body.
  fillHeight?: boolean;
};

export function CfStreamPlayer({ videoId, fillHeight = false }: Props) {
  // fillHeight mode: aspect-video on mobile (natural sizing inside a
  // scrolling page), w-full h-full on desktop (fills its flex-1 slot
  // so the page can fit the viewport exactly).
  const wrapperClass = fillHeight
    ? "aspect-video md:aspect-auto w-full md:h-full bg-black lms-player"
    : "aspect-video w-full bg-black lms-player";

  if (!videoId) {
    const placeholderClass = fillHeight
      ? "aspect-video md:aspect-auto w-full md:h-full bg-[#E0E5E9] flex items-center justify-center text-[#733D29]"
      : "aspect-video w-full bg-[#E0E5E9] flex items-center justify-center text-[#733D29]";
    return <div className={placeholderClass}>Video wird vorbereitet</div>;
  }

  const src = `https://${CF_DOMAIN}/${videoId}/manifest/video.m3u8`;
  const poster = `https://${CF_DOMAIN}/${videoId}/thumbnails/thumbnail.jpg?height=1080`;

  return (
    <div className={wrapperClass}>
      <MediaPlayer
        src={{ src, type: "application/x-mpegurl" }}
        title="EPHIA Lehrvideo"
        poster={poster}
        playsInline
        crossOrigin
        className="w-full h-full"
      >
        <MediaProvider />
        <DefaultVideoLayout icons={defaultLayoutIcons} />
      </MediaPlayer>
    </div>
  );
}
