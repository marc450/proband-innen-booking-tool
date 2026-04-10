"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  html: string;
  className?: string;
  minHeight?: number;
}

/**
 * Renders campaign email HTML inside an isolated <iframe> so the dashboard's
 * Tailwind preflight styles don't alter paragraph spacing, line-heights, or
 * collapse empty breaks. This mirrors how a real email client (Gmail etc.)
 * renders the message.
 */
export function EmailPreview({ html, className = "", minHeight = 400 }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(minHeight);

  // Wrap the campaign HTML in a minimal HTML shell so browser defaults apply.
  const srcDoc = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body { margin: 0; padding: 0; background: #ffffff; }
      body { font-family: Arial, sans-serif; color: #111; }
      img { max-width: 100%; height: auto; }
      a { color: #0066FF; }
    </style>
  </head>
  <body>${html}</body>
</html>`;

  // Auto-resize the iframe to its content so it feels inline.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const resize = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;
      const h = Math.max(
        doc.body?.scrollHeight || 0,
        doc.documentElement?.scrollHeight || 0,
      );
      if (h > 0) setHeight(Math.max(h + 16, minHeight));
    };

    const onLoad = () => {
      resize();
      // Images may arrive after load
      const imgs = iframe.contentDocument?.images;
      if (imgs) {
        for (const img of Array.from(imgs)) {
          if (!img.complete) img.addEventListener("load", resize, { once: true });
        }
      }
    };

    iframe.addEventListener("load", onLoad);
    return () => iframe.removeEventListener("load", onLoad);
  }, [html, minHeight]);

  return (
    <iframe
      ref={iframeRef}
      title="E-Mail Vorschau"
      srcDoc={srcDoc}
      className={`w-full border-0 bg-white ${className}`}
      style={{ height }}
      sandbox="allow-same-origin"
    />
  );
}
