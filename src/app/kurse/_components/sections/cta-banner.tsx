import type { CourseCtaBannerContent } from "@/content/kurse/types";
import { CtaBannerButton } from "./cta-banner-button";

export function CtaBanner({
  content,
  priceSuffix,
}: {
  content: CourseCtaBannerContent;
  /** Optional "EUR 250" suffix appended to the CTA when doing direct checkout */
  priceSuffix?: string;
}) {
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
          priceSuffix={priceSuffix}
        />
      </div>
    </section>
  );
}
