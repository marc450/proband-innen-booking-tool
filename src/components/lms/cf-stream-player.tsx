// Cloudflare Stream video embed.
//
// One mode: aspect-video (16:9), full width of its parent container.
// The parent decides the width — full-bleed on dedicated video pages,
// constrained inside a max-w-3xl text body for inline videos.
//
// videoId === null shows a "Video wird vorbereitet" placeholder so
// freshly seeded video lessons render gracefully before the file is
// uploaded.

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

  const src = `https://${CF_DOMAIN}/${videoId}/iframe?primaryColor=%230066FF&letterboxColor=%23000000`;

  return (
    <div className="aspect-video w-full bg-black">
      <iframe
        src={src}
        loading="lazy"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen
        className="w-full h-full border-0"
        title="EPHIA Lehrvideo"
      />
    </div>
  );
}
