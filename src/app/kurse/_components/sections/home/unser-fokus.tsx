import {
  GraduationCap,
  Heart,
  Users,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { HomeFokusContent } from "@/content/kurse/home-types";

const ICON_MAP: Record<string, LucideIcon> = {
  GraduationCap,
  Heart,
  Users,
};

export function UnserFokus({ content }: { content: HomeFokusContent }) {
  return (
    <section className="bg-[#FAEBE1] py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center tracking-wide mb-14">
          {content.heading}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8 max-w-5xl mx-auto">
          {content.items.map((item) => {
            const Icon = ICON_MAP[item.icon] ?? Sparkles;
            return (
              <div
                key={item.title}
                className="flex flex-col items-center text-center"
              >
                <div className="w-14 h-14 rounded-full bg-[#0066FF]/10 flex items-center justify-center mb-5">
                  <Icon
                    className="w-7 h-7 text-[#0066FF]"
                    strokeWidth={2.25}
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-base md:text-lg font-bold text-black mb-5 max-w-[14rem]">
                  {item.title}
                </h3>
                <a
                  href={item.href}
                  className="inline-block text-sm font-semibold text-[#0066FF] hover:text-[#0055DD] bg-white hover:bg-white/90 rounded-[10px] px-5 py-2.5 transition-colors"
                >
                  {item.ctaLabel}
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
