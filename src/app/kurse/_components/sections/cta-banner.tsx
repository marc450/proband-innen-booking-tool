import type { CourseCtaBannerContent } from "@/content/kurse/types";

export function CtaBanner({ content }: { content: CourseCtaBannerContent }) {
  return (
    <section className="py-16 md:py-20" style={{ backgroundColor: "#0066FF" }}>
      <div className="max-w-4xl mx-auto px-5 md:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-8 tracking-tight">
          {content.heading}
        </h2>
        <a
          href={content.ctaHref}
          className="inline-block text-[1.1rem] font-bold text-[#0066FF] bg-white hover:bg-white/90 rounded-[10px] px-6 py-3.5 transition-colors"
        >
          {content.ctaLabel}
        </a>
      </div>
    </section>
  );
}
