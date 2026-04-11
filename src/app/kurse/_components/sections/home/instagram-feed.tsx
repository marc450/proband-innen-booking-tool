"use client";

import Script from "next/script";
import type { HomeInstagramContent } from "@/content/kurse/home-types";
import { SectionEyebrow } from "../../section-eyebrow";

export function InstagramFeed({ content }: { content: HomeInstagramContent }) {
  return (
    <section className="bg-[#FAEBE1] py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        {content.eyebrow && (
          <div className="text-center">
            <SectionEyebrow>{content.eyebrow}</SectionEyebrow>
          </div>
        )}
        <h2
          className={`text-3xl md:text-4xl font-bold text-center tracking-wide ${
            content.subheading ? "mb-3" : "mb-10 md:mb-14"
          }`}
        >
          {content.heading}
        </h2>
        {content.subheading && (
          <p className="text-center text-black/70 mb-10 md:mb-14">
            {content.subheading}
          </p>
        )}

        <div className="rounded-[10px] overflow-hidden">
          <iframe
            src={`https://cdn.lightwidget.com/widgets/${content.widgetId}.html`}
            scrolling="no"
            allowTransparency
            className="lightwidget-widget"
            style={{ width: "100%", border: 0, overflow: "hidden" }}
            title="EPHIA auf Instagram"
            loading="lazy"
          />
          <Script
            src="https://cdn.lightwidget.com/widgets/lightwidget.js"
            strategy="lazyOnload"
          />
        </div>
      </div>
    </section>
  );
}
