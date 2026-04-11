import Image from "next/image";
import { Check } from "lucide-react";
import type { HomeHeroContent } from "@/content/kurse/home-types";

export function HomeHero({ content }: { content: HomeHeroContent }) {
  return (
    <section className="bg-[#FAEBE1] pt-12 pb-16 md:pt-20 md:pb-24">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Image */}
          <div className="relative rounded-[10px] overflow-hidden bg-black/5 aspect-[4/5] md:aspect-[4/3] lg:aspect-[4/5]">
            <Image
              src={content.imagePath}
              alt={content.imageAlt}
              fill
              priority
              quality={90}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>

          {/* Text */}
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-8 leading-[1.05]">
              {content.heading}
            </h1>

            <ul className="flex flex-col gap-3 mb-10">
              {content.checklist.map((item) => (
                <li key={item.text} className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#0066FF]/10 flex-shrink-0">
                    <Check
                      className="w-4 h-4 text-[#0066FF]"
                      strokeWidth={3}
                      aria-hidden="true"
                    />
                  </span>
                  <span className="text-base md:text-lg font-semibold text-black">
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
