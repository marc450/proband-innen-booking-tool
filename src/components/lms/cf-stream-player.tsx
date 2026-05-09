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

// German translations for the vidstack DefaultVideoLayout. Only the
// labels actually surfaced in our UI (after player-overrides.css
// hides Accessibility / PiP) need to be German; the rest are kept
// translated as a courtesy for screen-reader users.
const TRANSLATIONS_DE = {
  Play: "Abspielen",
  Pause: "Pause",
  Replay: "Erneut abspielen",
  Mute: "Stumm",
  Unmute: "Ton an",
  Volume: "Lautstärke",
  Settings: "Einstellungen",
  Default: "Standard",
  Auto: "Auto",
  Speed: "Geschwindigkeit",
  Normal: "Normal",
  Quality: "Qualität",
  Loop: "Wiederholen",
  Captions: "Untertitel",
  "Closed Captions": "Untertitel",
  "Captions Off": "Aus",
  "Captions Lookup": "Untertitel suchen",
  Off: "Aus",
  None: "Keine",
  Audio: "Audio",
  "Audio Track": "Audio-Spur",
  "Audio Boost": "Audio-Verstärkung",
  "Reset Boost": "Verstärkung zurücksetzen",
  Boost: "Verstärkung",
  Track: "Spur",
  Original: "Original",
  Playback: "Wiedergabe",
  Fullscreen: "Vollbild",
  PiP: "Bild-im-Bild",
  AirPlay: "AirPlay",
  "Google Cast": "Google Cast",
  Disconnected: "Nicht verbunden",
  Connected: "Verbunden",
  Connecting: "Verbinde…",
  "Skip Forward": "Vorspulen",
  "Skip Backward": "Zurückspulen",
  Forward: "Vorwärts",
  Rewind: "Zurück",
  Seek: "Springen",
  "Seek Forward": "Vorwärts springen",
  "Seek Backward": "Zurück springen",
  "Seek to": "Springe zu",
  Live: "LIVE",
  LIVE: "LIVE",
  "Skip To Live": "Zu Live springen",
  Continue: "Fortsetzen",
  Accessibility: "Barrierefreiheit",
  Announcements: "Ansagen",
  "Keyboard Animations": "Tastatur-Animationen",
  Font: "Schrift",
  Family: "Familie",
  Size: "Grösse",
  Color: "Farbe",
  Opacity: "Deckkraft",
  Background: "Hintergrund",
  Text: "Text",
  Window: "Fenster",
  Shadow: "Schatten",
  Display: "Anzeige",
  Style: "Stil",
  Reset: "Zurücksetzen",
  "Caption Styles": "Untertitel-Stil",
};

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
        <DefaultVideoLayout
          icons={defaultLayoutIcons}
          translations={TRANSLATIONS_DE}
        />
      </MediaPlayer>
    </div>
  );
}
