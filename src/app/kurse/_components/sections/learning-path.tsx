import {
  BookOpen,
  Users,
  MessageCircleHeart,
  Stethoscope,
  Sparkles,
  Syringe,
  Target,
  GraduationCap,
  ShieldCheck,
  Compass,
  Heart,
  ScanFace,
  Check,
  Minus,
  type LucideIcon,
} from "lucide-react";
import type { CourseLearningPathContent } from "@/content/kurse/types";

const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen,
  Users,
  MessageCircleHeart,
  Stethoscope,
  Syringe,
  Target,
  GraduationCap,
  ShieldCheck,
  Compass,
  Heart,
  ScanFace,
  Sparkles,
};

export function LearningPath({
  content,
}: {
  content: CourseLearningPathContent;
}) {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-left md:text-center tracking-wide mb-4">
          {content.heading}
        </h2>
        {content.intro && (
          <p className="max-w-3xl md:mx-auto text-left md:text-center text-base md:text-lg text-black/70 leading-relaxed mb-14">
            {content.intro}
          </p>
        )}

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-8">
          {content.steps.map((step) => {
            const Icon = (step.icon && ICON_MAP[step.icon]) || Sparkles;
            return (
              <div
                key={step.number}
                className="relative bg-[#FAEBE1] rounded-[10px] p-6 md:p-8 pt-10"
              >
                <div className="absolute -top-5 left-6 md:left-8 bg-[#0066FF] text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg tabular-nums shadow-md">
                  {step.number}
                </div>
                <div className="mb-4 w-12 h-12 rounded-[10px] bg-[#0066FF]/10 flex items-center justify-center">
                  <Icon
                    className="w-6 h-6 text-[#0066FF]"
                    aria-hidden="true"
                  />
                </div>
                {step.format && (
                  <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[#0066FF] mb-2">
                    {step.format}
                  </p>
                )}
                <h3 className="text-lg md:text-xl font-bold mb-2">
                  {step.title}
                </h3>
                <p className="text-sm md:text-base text-black/75 leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Prerequisites two-column block */}
        {content.prerequisites && (
          <div className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto mt-14 md:mt-20">
            <div className="bg-[#FAEBE1] rounded-[10px] p-6 md:p-8">
              <h3 className="text-xl md:text-2xl font-bold mb-5">
                {content.prerequisites.bringsHeading}
              </h3>
              <ul className="space-y-3">
                {content.prerequisites.brings.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Check
                      className="w-5 h-5 text-[#0066FF] flex-shrink-0 mt-0.5"
                      strokeWidth={2.5}
                      aria-hidden="true"
                    />
                    <span className="text-base text-black/85 leading-relaxed">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-[#FAEBE1] rounded-[10px] p-6 md:p-8">
              <h3 className="text-xl md:text-2xl font-bold mb-5">
                {content.prerequisites.notRequiredHeading}
              </h3>
              <ul className="space-y-3">
                {content.prerequisites.notRequired.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Minus
                      className="w-5 h-5 text-black/40 flex-shrink-0 mt-0.5"
                      strokeWidth={2.5}
                      aria-hidden="true"
                    />
                    <span className="text-base text-black/70 leading-relaxed">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
