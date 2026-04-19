import {
  Activity,
  BicepsFlexed,
  ClipboardCheck,
  Syringe,
  MessageCircleHeart,
  Target,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  BookOpen,
  Clock,
  Users,
  MapPin,
  ShieldCheck,
  Compass,
  Layers,
  GraduationCap,
  ScanFace,
  type LucideIcon,
} from "lucide-react";
import type { CourseLernzieleContent } from "@/content/kurse/types";

const ICON_MAP: Record<string, LucideIcon> = {
  Activity,
  BicepsFlexed,
  ClipboardCheck,
  Syringe,
  MessageCircleHeart,
  Target,
  ShieldAlert,
  // Extended set used by curriculum-style pages (Wozu / Personas / Lernformat).
  BookOpen,
  Clock,
  Users,
  MapPin,
  ShieldCheck,
  Compass,
  Layers,
  GraduationCap,
  ScanFace,
  Sparkles,
  Stethoscope,
};

export function Lernziele({ content }: { content: CourseLernzieleContent }) {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        {!content.hideAudienceLabel && (
          <div className="flex md:justify-center mb-4">
            <div className="inline-flex items-center gap-2 bg-[#FAEBE1] rounded-full px-3.5 py-1.5">
              <Stethoscope
                className="w-4 h-4 text-[#0066FF] flex-shrink-0"
                strokeWidth={2.5}
                aria-hidden="true"
              />
              <span className="text-xs md:text-sm font-semibold text-black">
                {content.audienceLabel || "Nur für approbierte Ärzt:innen"}
              </span>
            </div>
          </div>
        )}
        <h2 className="text-3xl md:text-4xl font-bold text-left md:text-center tracking-wide mb-4">
          {content.heading}
        </h2>
        {content.intro && (
          <p className="max-w-3xl md:mx-auto text-left md:text-center text-base md:text-lg text-black/70 leading-relaxed mb-14">
            {content.intro}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {content.items.map((item) => {
            const Icon = (item.icon && ICON_MAP[item.icon]) || Sparkles;
            return (
              <div
                key={item.label}
                className="bg-[#FAEBE1] rounded-[10px] p-6 md:p-7"
              >
                <div className="w-12 h-12 rounded-[10px] bg-[#0066FF]/10 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-[#0066FF]" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold mb-2">{item.label}</h3>
                <p className="text-sm md:text-base text-black/75 leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
