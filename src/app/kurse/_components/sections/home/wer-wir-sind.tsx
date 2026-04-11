import type { HomeWerWirSindContent } from "@/content/kurse/home-types";
import { HeroVideo } from "../hero-video";
import { TYPO } from "../../typography";

export function WerWirSind({ content }: { content: HomeWerWirSindContent }) {
  return (
    <section className="bg-[#FAEBE1] py-16 md:py-24">
      <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
        <h2 className={`${TYPO.h2} mb-3`}>
          {content.heading}
        </h2>
        <p className="italic text-black/70 mb-10">{content.subheading}</p>
      </div>

      <div className="max-w-xl md:max-w-7xl mx-auto px-5 md:px-8">
        <HeroVideo
          videoPath={content.videoPath}
          videoPoster={content.videoPoster}
          videoCaptionsPath={content.videoCaptionsPath}
          aspectClassName="aspect-[4/5] md:aspect-video"
        />
      </div>
    </section>
  );
}
