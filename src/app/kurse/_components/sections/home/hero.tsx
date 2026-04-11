import Image from "next/image";
import { Check } from "lucide-react";
import type { HomeHeroContent } from "@/content/kurse/home-types";

export function HomeHero({ content }: { content: HomeHeroContent }) {
  return (
    <section className="bg-[#FAEBE1] lg:pt-20 lg:pb-24">
      {/* Mobile + tablet: edge-to-edge cinematic hero */}
      <div className="lg:hidden relative h-[78vh] min-h-[560px] max-h-[780px] w-full overflow-hidden">
        <Image
          src={content.imagePath}
          alt={content.imageAlt}
          fill
          priority
          quality={90}
          sizes="100vw"
          className="object-cover"
        />

        {/* Dark gradient overlay for legibility */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/10"
        />

        {/* Foreground content anchored to bottom */}
        <div className="absolute inset-x-0 bottom-0 px-5 pt-20 pb-8">
          <h1 className="text-[2.1rem] sm:text-[2.5rem] font-bold tracking-tight leading-[1.08] text-white mb-5">
            {content.heading}
          </h1>

          <ul className="flex flex-col gap-2.5 mb-7">
            {content.checklist.map((item) => (
              <li key={item.text} className="flex items-center gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-white/15 backdrop-blur-sm flex-shrink-0">
                  <Check
                    className="w-4 h-4 text-white"
                    strokeWidth={3}
                    aria-hidden="true"
                  />
                </span>
                <span className="text-base font-semibold text-white">
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
