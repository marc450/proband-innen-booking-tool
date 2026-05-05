import type { CourseProseSectionContent } from "@/content/kurse/types";

interface ProseSectionProps {
  content: CourseProseSectionContent;
  /**
   * Outer background tone. Rose alternates against the white Lernziele
   * and LearningPath sections; white is available for contexts where
   * Rose would clash with the surrounding sections.
   */
  tone?: "rose" | "white";
}

export function ProseSection({ content, tone = "rose" }: ProseSectionProps) {
  const sectionBg = tone === "white" ? "bg-white" : "bg-[#FAEBE1]";
  const cardBg = tone === "white" ? "bg-[#FAEBE1]" : "bg-white";
  const layout = content.layout ?? "cards";

  return (
    <section className={`${sectionBg} py-16 md:py-24`}>
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-left md:text-center tracking-wide mb-4">
          {content.heading}
        </h2>
        {content.intro && (
          <p className="max-w-3xl md:mx-auto text-left md:text-center text-base md:text-lg text-black/70 leading-relaxed mb-14">
            {content.intro}
          </p>
        )}

        {layout === "editorial" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-14 md:gap-y-16">
            {content.items.map((item, i) => (
              <div key={item.title} className="group relative">
                <div
                  className="font-black leading-none mb-5 select-none"
                  style={{
                    fontSize: "clamp(80px, 11vw, 140px)",
                    WebkitTextStroke: "2px #0066FF",
                    color: "transparent",
                    letterSpacing: "-0.02em",
                  }}
                  aria-hidden="true"
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="h-[2px] w-12 bg-[#0066FF] mb-5 transition-all duration-300 group-hover:w-24" />
                <h3 className="text-xl md:text-2xl font-bold tracking-tight mb-3">
                  {item.title}
                </h3>
                <p className="text-base text-black/75 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {content.items.map((item) => (
              <div
                key={item.title}
                className={`${cardBg} rounded-[10px] p-6 md:p-7`}
              >
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-sm md:text-base text-black/75 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
