"use client";

import { useState } from "react";
import type { CourseGruppenbuchungenContent } from "@/content/kurse/types";
import { GroupInquiryDialog } from "./group-inquiry-dialog";

export function Gruppenbuchungen({
  content,
  courseTitle,
}: {
  content: CourseGruppenbuchungenContent;
  courseTitle?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <section className="py-24 md:py-32" style={{ backgroundColor: "#BF785E" }}>
        <div className="max-w-4xl mx-auto px-5 md:px-8 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold tracking-wide mb-6">
            {content.heading}
          </h2>
          <p className="text-base md:text-lg leading-relaxed mb-8 text-white/95">
            {content.description}
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-block text-[1.1rem] font-bold text-[#BF785E] bg-white hover:bg-white/90 rounded-[10px] px-6 py-3.5 transition-colors"
          >
            {content.ctaLabel}
          </button>
        </div>
      </section>

      <GroupInquiryDialog
        open={open}
        onClose={() => setOpen(false)}
        ctaLabel={content.ctaLabel}
        courseTitle={courseTitle}
      />
    </>
  );
}
