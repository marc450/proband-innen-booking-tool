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
            videoCaptionsPath={content.videoCaptionsPath}
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

            {content.stats && content.stats.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-y-2 mb-8">
                {content.stats.map((stat, i) => {
                  const Icon = STAT_ICON_MAP[stat.icon] || Sparkles;
                  return (
                    <div
                      key={stat.label}
                      className={`flex items-center gap-2 text-[13px] md:text-sm ${
                        i > 0 ? "sm:pl-4 sm:ml-4 sm:border-l sm:border-black/15" : ""
                      }`}
                    >
                      <Icon
                        className="w-4 h-4 text-[#0066FF] flex-shrink-0"
                        strokeWidth={2.5}
                        aria-hidden="true"
                      />
                      <span className="font-semibold text-black">
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

            <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
              <a
                href="#kursangebote"
                className="inline-block text-[1.1rem] font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-6 py-3.5 transition-colors text-center sm:text-left"
              >
                Zu den Kursangeboten
              </a>
              {content.socialProof && (
                <div className="flex items-center gap-2 text-sm text-black/70">
                  <Users
                    className="w-4 h-4 text-[#0066FF] flex-shrink-0"
                    strokeWidth={2.5}
                    aria-hidden="true"
                  />
                  <span className="font-semibold">{content.socialProof}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
