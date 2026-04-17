import type { CourseCtaBannerContent } from "@/content/kurse/types";
import { CtaBannerButton } from "./cta-banner-button";

export function CtaBanner({ content }: { content: CourseCtaBannerContent }) {
  return (
    <section className="py-16 md:py-20" style={{ backgroundColor: "#0066FF" }}>
      <div className="max-w-4xl mx-auto px-5 md:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-8 tracking-tight">
          {content.heading}
        </h2>
        <CtaBannerButton
          label={content.ctaLabel}
          href={content.ctaHref}
          directCheckoutCourseKey={content.directCheckoutCourseKey}
        />
      </div>
    </section>
  );
}
