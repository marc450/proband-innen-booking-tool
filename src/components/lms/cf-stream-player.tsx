// Cloudflare Stream video embed.
//
// Uses the Stream-hosted player iframe for now (zero JS, just an
// iframe pointing at the customer subdomain). We can swap to a custom
// vidstack/HLS player later without changing call sites.
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
      <div className="aspect-video bg-[#E0E5E9] rounded-[10px] flex items-center justify-center text-[#733D29]">
        Video wird vorbereitet
      </div>
    );
  }

  const src = `https://${CF_DOMAIN}/${videoId}/iframe?primaryColor=%230066FF&letterboxColor=%23FAEBE1`;

  return (
    <div className="aspect-video rounded-[10px] overflow-hidden bg-black">
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
