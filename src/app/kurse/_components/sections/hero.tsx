import {
  Clock,
  Award,
  GraduationCap,
  Blend,
  Users,
  MapPin,
  Calendar,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { CourseHeroContent } from "@/content/kurse/types";
import { HeroVideo } from "./hero-video";

const STAT_ICON_MAP: Record<string, LucideIcon> = {
  Clock,
  Award,
  GraduationCap,
  Blend,
  Users,
  MapPin,
  Calendar,
};

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

            <div className="h-px bg-black/10 mb-6" />

            {content.stats && content.stats.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mb-7 items-start">
                {content.stats.map((stat) => {
                  const Icon = STAT_ICON_MAP[stat.icon] || Sparkles;
                  return (
                    <div key={stat.label} className="flex flex-col items-start">
                      <Icon
                        className="w-5 h-5 text-[#0066FF] mb-2"
                        strokeWidth={2.25}
                      />
                      <span className="text-[11px] uppercase tracking-wider text-black/55 font-semibold mb-0.5">
                        {stat.label}
                      </span>
                      <span className="text-sm md:text-[15px] font-bold text-black leading-tight">
                        {stat.value}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-base md:text-[17px] leading-relaxed text-black/75">
              {content.subheadline && (
                <strong className="font-bold text-black">
                  {content.subheadline}
                </strong>
              )}
              {content.subheadline && " "}
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
