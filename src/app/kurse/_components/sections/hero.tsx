import type { CourseHeroContent } from "@/content/kurse/types";
import { HeroVideo } from "./hero-video";

export function Hero({ content }: { content: CourseHeroContent }) {
  return (
    <section className="bg-[#FAEBE1] pt-12 pb-16 md:pt-20 md:pb-24">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Media (video with poster fallback + unmute button) */}
          <HeroVideo
            videoPath={content.videoPath}
            videoPoster={content.videoPoster}
          />

          {/* Text */}
          <div>
            {content.kicker && (
              <p className="text-xs md:text-sm font-semibold tracking-[0.2em] text-[#0066FF] mb-4">
                {content.kicker}
              </p>
            )}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.05]">
              {content.heading}
            </h1>

            {content.featureTags.length > 0 && (
              <ul className="flex flex-wrap gap-2 mb-6">
                {content.featureTags.map((tag) => (
                  <li
                    key={tag}
                    className="text-xs md:text-sm font-semibold text-[#0066FF] bg-white/70 rounded-full px-3 py-1.5"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            )}

            <p className="text-base md:text-lg leading-relaxed text-black/80">
              {content.description}
            </p>

            <div className="mt-8">
              <a
                href="#kursangebote"
                className="inline-block text-[1.1rem] font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-6 py-3.5 transition-colors"
              >
                Zu den Kursangeboten
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
