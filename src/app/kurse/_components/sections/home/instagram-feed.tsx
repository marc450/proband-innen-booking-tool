"use client";

import Script from "next/script";
import type { HomeInstagramContent } from "@/content/kurse/home-types";
import { TYPO } from "../../typography";

export function InstagramFeed({ content }: { content: HomeInstagramContent }) {
  return (
    <section className="bg-[#FAEBE1] py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <h2
          className={`${TYPO.h2} text-center ${
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
