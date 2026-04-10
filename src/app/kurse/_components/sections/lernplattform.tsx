import { Check } from "lucide-react";
import type { CourseLernplattformContent } from "@/content/kurse/types";
import { ExpandableMedia } from "./expandable-media";

export function Lernplattform({
  content,
}: {
  content: CourseLernplattformContent;
}) {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center tracking-wide mb-14">
          {content.heading}
        </h2>

        <div className="space-y-16 md:space-y-24">
          {content.features.map((feature, idx) => {
            const mediaFirst = idx % 2 === 0;

            const media = (
              <ExpandableMedia
                mediaPath={feature.mediaPath}
                mediaPoster={feature.mediaPoster}
                title={feature.title}
              />
            );

            const text = (
              <div>
                <h3 className="text-2xl md:text-3xl font-bold mb-4">{feature.title}</h3>
                <p className="text-base md:text-lg text-black/75 leading-relaxed mb-5">
                  {feature.description}
                </p>
                {feature.bullets && feature.bullets.length > 0 && (
                  <ul className="space-y-2.5">
                    {feature.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-[#0066FF] shrink-0 mt-0.5" aria-hidden="true" />
                        <span className="text-sm md:text-base text-black/80 leading-relaxed">
                          {b}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );

            return (
              <div
                key={feature.title}
                className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center"
              >
                {mediaFirst ? (
                  <>
                    {media}
                    {text}
                  </>
                ) : (
                  <>
                    <div className="lg:order-2">{media}</div>
                    <div className="lg:order-1">{text}</div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
