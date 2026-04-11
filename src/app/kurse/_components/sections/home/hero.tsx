import Image from "next/image";
import { Check } from "lucide-react";
import type { HomeHeroContent } from "@/content/kurse/home-types";

export function HomeHero({ content }: { content: HomeHeroContent }) {
  return (
    <section className="relative bg-[#FAEBE1] lg:pt-20 lg:pb-24 overflow-hidden">
      {/* Mobile + tablet: text-only hero with subtle gradient backdrop */}
      <div className="lg:hidden relative">
        {/* Soft radial accent behind the headline for a little depth */}
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-20 w-[420px] h-[420px] rounded-full bg-[#0066FF]/5 blur-3xl pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute bottom-0 -left-24 w-[360px] h-[360px] rounded-full bg-[#BF785E]/10 blur-3xl pointer-events-none"
        />

        <div className="relative max-w-3xl mx-auto px-5 pt-14 pb-20 sm:pt-20 sm:pb-24">
          <h1 className="text-[2.5rem] sm:text-[3rem] font-bold tracking-tight leading-[1.05] text-black mb-8">
            {content.heading}
          </h1>

          <ul className="flex flex-col gap-4 mb-10">
            {content.checklist.map((item) => (
              <li key={item.text} className="flex items-center gap-4">
                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-[#0066FF]/10 flex-shrink-0">
                  <Check
                    className="w-6 h-6 text-[#0066FF]"
                    strokeWidth={3}
                    aria-hidden="true"
                  />
                </span>
                <span className="text-lg font-semibold text-black">
                  {item.text}
                </span>
              </li>
            ))}
          </ul>

          <a
            href={content.ctaHref}
            className="inline-block text-base font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-6 py-3.5 transition-colors"
          >
            {content.ctaLabel}
          </a>
        </div>
      </div>

      {/* Desktop: classic two-column split */}
      <div className="hidden lg:block max-w-7xl mx-auto px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative rounded-[10px] overflow-hidden bg-black/5 aspect-[4/5]">
            <Image
              src={content.imagePath}
              alt={content.imageAlt}
              fill
              priority
              quality={90}
              sizes="50vw"
              className="object-cover"
            />
          </div>

          <div>
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight mb-8 leading-[1.05]">
              {content.heading}
            </h1>

            <ul className="flex flex-col gap-4 mb-10">
              {content.checklist.map((item) => (
                <li key={item.text} className="flex items-center gap-4">
                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-[#0066FF]/10 flex-shrink-0">
                    <Check
                      className="w-6 h-6 text-[#0066FF]"
                      strokeWidth={3}
                      aria-hidden="true"
                    />
                  </span>
                  <span className="text-lg md:text-xl font-semibold text-black">
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>

            <a
              href={content.ctaHref}
              className="inline-block text-[1.1rem] font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-6 py-3.5 transition-colors"
            >
              {content.ctaLabel}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
