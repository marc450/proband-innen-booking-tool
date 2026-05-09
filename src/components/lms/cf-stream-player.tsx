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

const CF_DOMAIN =
  process.env.NEXT_PUBLIC_CF_STREAM_CUSTOMER_DOMAIN ||
  "customer-pimyxl0m3pl3lwao.cloudflarestream.com";

export function CfStreamPlayer({ videoId }: { videoId: string | null }) {
  if (!videoId) {
    return (
      <div className="aspect-video w-full bg-[#E0E5E9] flex items-center justify-center text-[#733D29]">
        Video wird vorbereitet
      </div>
    );
  }

  const src = `https://${CF_DOMAIN}/${videoId}/manifest/video.m3u8`;
  const poster = `https://${CF_DOMAIN}/${videoId}/thumbnails/thumbnail.jpg?height=1080`;

  return (
    <div className="aspect-video w-full bg-black">
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
