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

type Props = {
  videoId: string | null;
  // When true, the player fills its parent container (used for
  // dedicated video-lesson pages). When false (default), the player
  // uses a 16:9 aspect-ratio box with rounded corners — the right
  // shape for inline videos inside a text body.
  fillMode?: boolean;
};

export function CfStreamPlayer({ videoId, fillMode = false }: Props) {
  const wrapperClass = fillMode
    ? "w-full h-full bg-black"
    : "aspect-video rounded-[10px] overflow-hidden bg-black";

  if (!videoId) {
    const placeholderClass = fillMode
      ? "w-full h-full bg-[#E0E5E9] flex items-center justify-center text-[#733D29]"
      : "aspect-video bg-[#E0E5E9] rounded-[10px] flex items-center justify-center text-[#733D29]";
    return <div className={placeholderClass}>Video wird vorbereitet</div>;
  }

  const src = `https://${CF_DOMAIN}/${videoId}/iframe?primaryColor=%230066FF&letterboxColor=%23000000`;

  return (
    <div className={wrapperClass}>
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
