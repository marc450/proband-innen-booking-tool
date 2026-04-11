import type { HomeWerWirSindContent } from "@/content/kurse/home-types";
import { HeroVideo } from "../hero-video";

export function WerWirSind({ content }: { content: HomeWerWirSindContent }) {
  return (
    <section className="bg-[#FAEBE1] py-16 md:py-24">
      <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold tracking-wide mb-3">
          {content.heading}
        </h2>
        <p className="italic text-black/70 mb-10">{content.subheading}</p>

        <div className="max-w-xl mx-auto">
          <HeroVideo
            videoPath={content.videoPath}
            videoPoster={content.videoPoster}
            videoCaptionsPath={content.videoCaptionsPath}
          />
        </div>

        <div className="mt-6">
          <p className="font-bold text-black">{content.personName}</p>
          <p className="text-sm text-black/60">{content.personTitle}</p>
        </div>
      </div>
    </section>
  );
}
