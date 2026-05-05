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
      </div>
    </section>
  );
}
